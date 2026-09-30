import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ok, fail } from '@/lib/api';
import { getAuthContext } from '@/lib/session';
import { requireWritableOrg } from '@/lib/auth/require-writable';
import { requireEditorRole } from '@/lib/auth/require-role';
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
import { requireActiveAccess, requireFeaturePlan } from '@/lib/billing/server-gate';
import { consumeCredits, settleAiCredits, InsufficientCreditsError, type CreditSpend } from '@/lib/credits';
import { AI_OPERATIONS, chargeFor, maxCreditsFor, type AiUsage } from '@/lib/ai/credit-cost';
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

/** See the streaming branch below; mirrored in AgentClient. */
const ANSWER_COMPLETE_MARKER = '\u0004';

/**
 * Starts the cost trailer that closes EVERY stream, after the answer and its
 * ANSWER_COMPLETE_MARKER: this character, then JSON
 * { creditsCharged, creditsRemaining }. The real cost is only known once the
 * model has finished, long after the headers went out. Mirrored in AgentClient.
 */
const COST_TRAILER_MARKER = '\u0005';

/**
 * Closes the reservation of one analysis. `used` null means the model failed
 * (or reported no usage at all): 1 credit is kept, as when every analysis cost
 * 1 (founder's decision). Otherwise the real cost, never above the maximum.
 */
async function settleAnalysis(
  organizationId: string,
  spend: CreditSpend,
  used: { model: string; usage: AiUsage } | null,
): Promise<{ charged: number; remaining: number }> {
  const charged = used ? chargeFor('analyze', used.model, used.usage) : 1;
  return settleAiCredits(organizationId, spend, charged, used);
}


export async function POST(req: NextRequest) {
  // Auth (strict): a real logged-in user with an org, no demo fallback.
  const ctx = await getAuthContext();
  if (!ctx) return fail('Unauthorized', 401);
  // Demo organization: read-only. See requireWritableOrg.
  const readOnly = requireWritableOrg(ctx.organizationId);
  if (readOnly) return readOnly;
  // Viewer: read-only role — see requireEditorRole.
  const viewerOnly = requireEditorRole(ctx);
  if (viewerOnly) return viewerOnly;
  const { organizationId } = ctx;

  // This route is the AI Agent's (AgentClient.tsx is its only caller — the chat
  // uses /api/ai/chat), and the agent is a plan feature. Checked before the
  // trial gate: "your plan does not include this" is the permanent answer.
  const planLocked = await requireFeaturePlan(organizationId, 'ai_agent');
  if (planLocked) return planLocked;

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
  // consumeCredits spends the plan balance first and the purchased balance for
  // the remainder, checking affordability and subtracting in ONE SQL statement,
  // so concurrent requests can never drive the balance negative, and an empty
  // balance raises InsufficientCreditsError → 402 'INSUFFICIENT_CREDITS'
  // WITHOUT calling the model. Placed after the 501/503 guards and after the
  // prompt build so a request that never reaches Anthropic is never billed;
  // being before the branch below, the stream can only open once paid.
  // What is reserved is the MAXIMUM an analysis can cost (maxCreditsFor); fewer
  // credits than that → 402 (founder's decision). The unused part goes back
  // once the model has finished (settleAnalysis); a model failure keeps 1.
  // `remaining` is the sum of both balances: the number the user sees.
  let spend: CreditSpend;
  try {
    spend = await consumeCredits(organizationId, maxCreditsFor('analyze'));
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
    let stopReason: string | null = null;
    let used: { model: string; usage: AiUsage } | null = null;
    // enqueue throws once the customer has gone (the stream was cancelled):
    // from then on nothing more is sent, but the credits are still settled.
    const send = (text: string) => {
      try {
        controller.enqueue(encoder.encode(text));
      } catch {
        // Nobody is listening any more.
      }
    };
    let controller!: ReadableStreamDefaultController<Uint8Array>;
    const body = new ReadableStream<Uint8Array>({
      async start(c) {
        controller = c;
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
            onStopReason: (r) => {
              stopReason = r;
            },
            onUsage: (model, usage) => {
              used = usage ? { model, usage } : null;
            },
            maxTokens: AI_OPERATIONS.analyze.maxOutputTokens,
          })) {
            controller.enqueue(encoder.encode(chunk));
          }
          // End-of-answer marker, sent ONLY when the answer finished on its
          // own. A stream that ends without it — cut by the length ceiling,
          // an error, or the function being stopped by the platform — is shown
          // to the customer as incomplete (AgentClient), never as a full answer.
          if (stopReason === 'end_turn') send(ANSWER_COMPLETE_MARKER);
        } catch (err) {
          console.error('[ai/analyze] stream error:', err);
        } finally {
          // Settled whatever happened above, exactly once: a stream cut by an
          // error or by the customer leaving is charged on the tokens it had
          // reported (chatStream), or 1 credit if it reported none.
          try {
            const settled = await settleAnalysis(organizationId, spend, used);
            send(COST_TRAILER_MARKER + JSON.stringify({ creditsCharged: settled.charged, creditsRemaining: settled.remaining }));
          } catch (settleErr) {
            console.error('[ai/analyze] credit settlement FAILED:', settleErr);
          }
          try {
            controller.close();
          } catch {
            // Already cancelled by the customer.
          }
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
        // the streaming counterpart of chat's `creditsRemaining` field. This is
        // the balance with the MAXIMUM reserved; the one after the real cost
        // arrives in the cost trailer at the end of the stream.
        'X-Credits-Remaining': String(spend.remaining),
      },
    });
  }

  // Non-streaming path (unchanged): single JSON envelope.
  let result;
  try {
    result = await chatComplete(systemPrompt, messages, {
      cacheSystemPrompt: true,
      logLabel: `analyze:${type}`,
      surface: 'analyze',
      maxTokens: AI_OPERATIONS.analyze.maxOutputTokens,
    });
  } catch (err) {
    // Errore vero nei log (marcatore [ai:error]), messaggio generico al
    // browser: il testo di un errore Anthropic puo' contenere dettagli sulla
    // configurazione che non devono uscire. Status 502 invariato.
    console.error('[ai:error] surface=analyze', err);
    try {
      await settleAnalysis(organizationId, spend, null);
    } catch (settleErr) {
      console.error('[ai/analyze] credit settlement FAILED after an error:', settleErr);
    }
    return fail('AI_REQUEST_FAILED', 502);
  }
  const settled = await settleAnalysis(
    organizationId,
    spend,
    result.usage ? { model: result.model, usage: result.usage } : null,
  );
  return ok({
    text: result.text,
    truncated: result.stopReason === 'max_tokens',
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    creditsRemaining: settled.remaining,
    creditsCharged: settled.charged,
  });
}
