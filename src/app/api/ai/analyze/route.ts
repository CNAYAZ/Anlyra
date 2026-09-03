import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ok, fail } from '@/lib/api';
import { getAuthContext } from '@/lib/session';
import { requireWritableOrg } from '@/lib/auth/require-writable';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { rateLimitResponse } from '@/lib/api/rate-limit-response';
import {
  chatComplete,
  chatStream,
  isAnthropicConfigured,
  MISSING_KEY_MESSAGE,
  type ChatTurn,
} from '@/lib/ai/client';
import { loadBusinessContext, type AIBusinessContext } from '@/lib/ai-context';
import { requireActiveAccess } from '@/lib/billing/server-gate';
import { consumeCredits, InsufficientCreditsError } from '@/lib/credits';
import { buildFinancialAnalysisPrompt } from '@/lib/ai/prompts/financial';
import { buildMarketingAnalysisPrompt } from '@/lib/ai/prompts/marketing';
import { buildKpiAnalysisPrompt } from '@/lib/ai/prompts/kpi';
import { buildCompetitorAnalysisPrompt } from '@/lib/ai/prompts/competitor';
import { buildChatPrompt } from '@/lib/ai/prompts/chat';

export const dynamic = 'force-dynamic';

// Specialized system-prompt builder per analysis mode. Every enum type is wired;
// a type outside the map (should not happen past Zod) falls through to a 501.
type PromptBuilder = (ctx: AIBusinessContext) => string;
const PROMPT_BUILDERS: Partial<Record<AnalyzeType, PromptBuilder>> = {
  financial: buildFinancialAnalysisPrompt,
  marketing: buildMarketingAnalysisPrompt,
  kpi: buildKpiAnalysisPrompt,
  competitor: buildCompetitorAnalysisPrompt,
  chat: buildChatPrompt,
};

const HistoryTurn = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(8000),
});

const AnalyzeSchema = z.object({
  // All five modes are live (see PROMPT_BUILDERS).
  type: z.enum(['financial', 'marketing', 'kpi', 'competitor', 'chat']),
  question: z.string().min(1).max(4000).optional(),
  history: z.array(HistoryTurn).max(20).optional(),
  // Opt-in: when true the response is a text stream of deltas; omitted/false
  // keeps the original JSON envelope, so existing/other consumers are untouched.
  stream: z.boolean().optional(),
});

type AnalyzeType = z.infer<typeof AnalyzeSchema>['type'];

// Credits charged per analysis, streaming or not. Same price as one chat turn
// (/api/ai/chat) and one alert analysis: a request is a request.
const ANALYSIS_CREDIT_COST = 1;


export async function POST(req: NextRequest) {
  // Auth (strict): a real logged-in user with an org, no demo fallback.
  const ctx = await getAuthContext();
  if (!ctx) return fail('Unauthorized', 401);
  // Demo organization: read-only. See requireWritableOrg.
  const readOnly = requireWritableOrg(ctx.organizationId);
  if (readOnly) return readOnly;
  const { organizationId } = ctx;

  // Trial/subscription gate: an expired trial (or past_due) is read-only and may
  // not run the AI. Blocked BEFORE the rate limit and any AI call, so no credits
  // are spent. active/trialing pass straight through, unchanged.
  const access = await requireActiveAccess(organizationId);
  if (!access.allowed) return fail('TRIAL_EXPIRED', 402);

  // Rate limit per IP+org — AI calls are expensive, so guard against abuse.
  // FAIL-CLOSED (see the 'ai-analyze' bucket): if the limiter cannot be reached
  // the request is refused rather than allowed to bill Anthropic unmetered.
  const rl = await checkRateLimit('ai-analyze', `${getClientIp(req)}:org:${organizationId}`);
  if (!rl.success) return rateLimitResponse(rl);

  const json = await req.json().catch(() => null);
  const parsed = AnalyzeSchema.safeParse(json);
  if (!parsed.success) return fail('INVALID_INPUT', 400);
  const { type, question, history } = parsed.data;

  // Select the specialized prompt builder for this mode. All five modes are
  // wired today, so this 501 is a defensive guard for a future mode added to the
  // Zod enum but not to PROMPT_BUILDERS. It returns BEFORE any credit is
  // charged: a mode that never calls the model must never cost a credit.
  const buildPrompt = PROMPT_BUILDERS[type];
  if (!buildPrompt) {
    return fail(`Analysis type "${type}" is not implemented yet`, 501);
  }

  if (!isAnthropicConfigured()) return fail(MISSING_KEY_MESSAGE, 503);

  // Real org data → specialized system prompt (never invents numbers).
  let systemPrompt: string;
  try {
    const businessCtx = await loadBusinessContext(organizationId);
    systemPrompt = buildPrompt(businessCtx);
  } catch (err) {
    console.error('[ai/analyze] failed to load business context:', err);
    return fail('Failed to load business data', 500);
  }

  // Build the turn list: optional prior history (for follow-up questions), then
  // the user turn. No question → full-analysis request; question → targeted answer.
  const messages: ChatTurn[] = [];
  if (history?.length) {
    for (const h of history) messages.push({ role: h.role, content: h.content });
  }
  messages.push({
    role: 'user',
    // No question → full-analysis request. Kept domain-agnostic on purpose: the
    // system prompt already fixes the domain (financial/marketing/…).
    content: question?.trim()
      ? question.trim()
      : 'Genera un\'analisi completa della mia situazione.',
  });

  // Credits: charged HERE, the last gate before the first Anthropic call, on both
  // the streaming and the non-streaming path. Same pattern as /api/ai/chat —
  // consumeCredits decrements conditionally in a single UPDATE (…WHERE aiCredits
  // >= cost), so concurrent requests can never drive the balance negative, and an
  // empty balance raises InsufficientCreditsError → 402 'INSUFFICIENT_CREDITS'
  // WITHOUT calling the model. Placed after the 501/503 guards and after the
  // prompt build so a request that never reaches Anthropic is never billed;
  // being before the branch below, the stream can only open once paid.
  // As in chat, a model failure after this point does NOT refund the credit.
  let creditsRemaining: number;
  try {
    creditsRemaining = await consumeCredits(organizationId, ANALYSIS_CREDIT_COST);
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return fail('INSUFFICIENT_CREDITS', 402);
    }
    throw err;
  }

  // Streaming path (opt-in). All auth/rate-limit/validation/config/credit errors
  // above already returned JSON with the right status BEFORE we get here, so the
  // stream only ever opens on a 200. An error raised AFTER the first byte cannot
  // change the status: we log it and close the stream cleanly, leaving the client
  // with whatever text already arrived (it surfaces a notice — see AgentClient).
  if (parsed.data.stream) {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of chatStream(systemPrompt, messages, {
            // Same mode + same org + same day → byte-identical system prompt
            // (see the prompt caching report). Worth caching when a user asks
            // a follow-up question in the same tab within a few minutes of
            // "Generate" or a prior question — not caching the messages array:
            // the frontend does not resend history today (each call is a
            // fresh single-turn request), so there is no growing prefix to
            // extend, only this one reusable system block.
            cacheSystemPrompt: true,
            logLabel: `analyze:${type}`,
            surface: 'analyze',
          })) {
            controller.enqueue(encoder.encode(chunk));
          }
        } catch (err) {
          console.error('[ai/analyze] stream error:', err);
        } finally {
          controller.close();
        }
      },
    });
    return new Response(body, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        // Disable proxy buffering so deltas reach the browser as they are produced.
        'X-Accel-Buffering': 'no',
        // The body is a raw text stream, so the balance travels as a header —
        // the streaming counterpart of chat's `creditsRemaining` field.
        'X-Credits-Remaining': String(creditsRemaining),
      },
    });
  }

  // Non-streaming path (unchanged): single JSON envelope.
  try {
    const result = await chatComplete(systemPrompt, messages, {
      cacheSystemPrompt: true,
      logLabel: `analyze:${type}`,
      surface: 'analyze',
    });
    return ok({
      text: result.text,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      creditsRemaining,
    });
  } catch (err) {
    // Errore vero nei log (marcatore [ai:error]), messaggio generico al
    // browser: il testo di un errore Anthropic puo' contenere dettagli sulla
    // configurazione che non devono uscire. Status 502 invariato.
    console.error('[ai:error] surface=analyze', err);
    return fail('AI_REQUEST_FAILED', 502);
  }
}
