import { ok, fail, failFromError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/session';
import { requireWritableOrg } from '@/lib/auth/require-writable';
import { requireEditorRole } from '@/lib/auth/require-role';
import { requireActiveAccess } from '@/lib/billing/server-gate';
import { isAnthropicConfigured, MISSING_KEY_MESSAGE } from '@/lib/ai/client';
import {
  consumeCredits,
  refundCredits,
  settleAiCredits,
  InsufficientCreditsError,
  type CreditSpend,
} from '@/lib/credits';
import { chargeFor, maxCreditsFor, type AiUsage } from '@/lib/ai/credit-cost';
import {
  AI_UNAVAILABLE,
  AI_UNAVAILABLE_STATUS,
  isAnthropicSpendLimitError,
  logAnthropicSpendLimit,
} from '@/lib/ai/spend-limit';
import { analyzeAlert, parseStoredAnalysis } from '@/lib/alerts/ai-analysis';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { rateLimitResponse } from '@/lib/api/rate-limit-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Credits charged per AI alert analysis: what the model used, never more than
// maxCreditsFor('alerts') — which is reserved BEFORE the call (founder's
// decision, 2026-09-30; until then a flat 1, charged after the call).

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) return fail('Unauthorized', 401);
    // Demo organization: read-only. See requireWritableOrg.
    const readOnly = requireWritableOrg(authCtx.organizationId);
    if (readOnly) return readOnly;
    // Viewer: read-only role — see requireEditorRole.
    const viewerOnly = requireEditorRole(authCtx);
    if (viewerOnly) return viewerOnly;
    const { organizationId } = authCtx;

    // Trial/subscription gate: an expired trial (or past_due) is read-only and
    // may not run the AI. Blocked BEFORE the rate limit and any AI call, so no
    // credits are spent. Same gate, same order and same 402 as /api/ai/chat,
    // /api/ai/analyze and /api/ai/insights/generate — this was the one AI
    // surface still missing it, so an organization past its trial could keep
    // spending credits here with none of the other three routes open to it.
    const access = await requireActiveAccess(organizationId);
    if (!access.allowed) return fail('TRIAL_EXPIRED', 402);

    // 0. Rate limit. This route calls the Anthropic model, and until now it was
    //    the ONLY model-calling route with no limiter at all — credits were the
    //    sole bound, and credits can be bought. Keyed per IP+org like
    //    /api/ai/analyze, and FAIL-CLOSED for the same reason: an unverifiable
    //    limiter must not open an unmetered path to a billed API.
    const rl = await checkRateLimit(
      'ai-alert-analyze',
      `${getClientIp(_req)}:org:${organizationId}`,
    );
    if (!rl.success) return rateLimitResponse(rl);

    // 1. Ownership: alert must exist and belong to the current org.
    const alert = await prisma.alert.findFirst({
      where: { id: (await ctx.params).id, organizationId },
    });
    if (!alert) return fail('NOT_FOUND', 404);

    // 2. Cache: return a previously generated analysis without calling the AI
    //    (and without charging credits again).
    const cached = parseStoredAnalysis(alert.aiAnalysis);
    if (cached) {
      return ok({ ...cached, cached: true });
    }

    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { name: true, industry: true, employees: true },
    });

    // 3. Configuration guard: no API key → 503 with a clear message.
    if (!isAnthropicConfigured()) {
      return fail(MISSING_KEY_MESSAGE, 503);
    }

    // 4. Reserve the MAXIMUM before the call, in the single atomic statement:
    //    two simultaneous analyses can never spend more than the balance
    //    holds. Fewer credits than the maximum → 402, nothing called.
    let spend: CreditSpend;
    try {
      spend = await consumeCredits(organizationId, maxCreditsFor('alerts'));
    } catch (e) {
      if (e instanceof InsufficientCreditsError) return fail('INSUFFICIENT_CREDITS', 402);
      throw e;
    }

    // 5. Call the AI. If it fails — including a reply that does not parse —
    //    the whole reservation goes back: an alert analysis that failed has
    //    never cost anything, and still does not.
    let used: { model: string; usage: AiUsage } | null = null;
    let analysis;
    try {
      analysis = await analyzeAlert(
        {
          title: alert.title,
          description: alert.description,
          severity: alert.severity,
          recommendation: alert.recommendation,
          source: alert.source,
        },
        { name: org.name, industry: org.industry, employees: org.employees },
        (model, usage) => {
          used = usage ? { model, usage } : null;
        },
      );
    } catch (e) {
      try {
        await refundCredits(organizationId, spend);
      } catch (refundErr) {
        console.error('[ai/alerts/analyze] credit refund FAILED after an error:', refundErr);
      }
      // Anthropic's spend limit or balance: the reservation is already back;
      // say "unavailable", not a generic failure (see @/lib/ai/spend-limit).
      if (isAnthropicSpendLimitError(e)) {
        logAnthropicSpendLimit('alerts-analyze', e);
        return fail(AI_UNAVAILABLE, AI_UNAVAILABLE_STATUS);
      }
      throw e;
    }

    // 6. Keep the real cost, give back the rest, then persist the result.
    const usedNow = used as { model: string; usage: AiUsage } | null;
    const settled = await settleAiCredits(
      organizationId,
      spend,
      usedNow ? chargeFor('alerts', usedNow.model, usedNow.usage) : 1,
      usedNow,
    );

    await prisma.alert.update({
      where: { id: alert.id },
      data: { aiAnalysis: JSON.stringify(analysis) },
    });

    return ok({
      ...analysis,
      cached: false,
      creditsRemaining: settled.remaining,
      creditsCharged: settled.charged,
    });
  } catch (e) {
    // Was fail((e as Error).message, 500): forwarded the raw error text to
    // the client and always answered 500, even for the getAuthContext-based
    // 401 case above having already returned. failFromError never leaks the
    // real message — only the server log gets it.
    return failFromError(e);
  }
}
