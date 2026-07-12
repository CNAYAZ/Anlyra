import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ok, fail } from '@/lib/api';
import { getAuthContext } from '@/lib/session';
import { checkRateLimit, getClientIp, retryAfterSeconds } from '@/lib/rate-limit';
import {
  chatComplete,
  isAnthropicConfigured,
  MISSING_KEY_MESSAGE,
  type ChatTurn,
} from '@/lib/ai/client';
import { loadBusinessContext } from '@/lib/ai-context';
import { buildFinancialAnalysisPrompt } from '@/lib/ai/prompts/financial';

export const dynamic = 'force-dynamic';

const HistoryTurn = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(8000),
});

const AnalyzeSchema = z.object({
  // Multi-mode by design; only "financial" is implemented in this pilot.
  type: z.enum(['financial', 'marketing', 'kpi', 'competitor', 'chat']),
  question: z.string().min(1).max(4000).optional(),
  history: z.array(HistoryTurn).max(20).optional(),
});

function tooManyRequests(reset: number) {
  return NextResponse.json(
    { success: false, error: 'RATE_LIMITED' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds(reset)) } },
  );
}

export async function POST(req: NextRequest) {
  // Auth (strict): a real logged-in user with an org, no demo fallback.
  const ctx = await getAuthContext();
  if (!ctx) return fail('Unauthorized', 401);
  const { organizationId } = ctx;

  // Rate limit per IP+org — AI calls are expensive, so guard against abuse.
  // Fails open if the limiter is not configured (see rate-limit.ts).
  const rl = await checkRateLimit('ai-analyze', `${getClientIp(req)}:org:${organizationId}`);
  if (!rl.success) return tooManyRequests(rl.reset);

  const json = await req.json().catch(() => null);
  const parsed = AnalyzeSchema.safeParse(json);
  if (!parsed.success) return fail('INVALID_INPUT', 400);
  const { type, question, history } = parsed.data;

  // Pilot scope: only the financial analyst is live; other modes come later.
  if (type !== 'financial') {
    return fail(`Analysis type "${type}" is not implemented yet`, 501);
  }

  if (!isAnthropicConfigured()) return fail(MISSING_KEY_MESSAGE, 503);

  // Real org data → specialized financial system prompt (never invents numbers).
  let systemPrompt: string;
  try {
    const businessCtx = await loadBusinessContext(organizationId);
    systemPrompt = buildFinancialAnalysisPrompt(businessCtx);
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
    content: question?.trim()
      ? question.trim()
      : 'Genera un\'analisi finanziaria completa della mia situazione.',
  });

  try {
    const result = await chatComplete(systemPrompt, messages);
    return ok({
      text: result.text,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
    });
  } catch (err) {
    console.error('[ai/analyze] Anthropic API error:', err);
    const msg = err instanceof Error ? err.message : 'AI request failed';
    return fail(msg, 502);
  }
}
