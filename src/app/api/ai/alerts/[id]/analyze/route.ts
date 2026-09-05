import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/session';
import { requireWritableOrg } from '@/lib/auth/require-writable';
import { requireActiveAccess } from '@/lib/billing/server-gate';
import { isAnthropicConfigured, MISSING_KEY_MESSAGE } from '@/lib/ai/client';
import { consumeCredits, InsufficientCreditsError } from '@/lib/credits';
import { analyzeAlert, parseStoredAnalysis } from '@/lib/alerts/ai-analysis';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { rateLimitResponse } from '@/lib/api/rate-limit-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Credits charged per AI alert analysis. Aligned with the insights pattern.
const ANALYSIS_CREDIT_COST = 1;

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) return fail('Unauthorized', 401);
    // Demo organization: read-only. See requireWritableOrg.
    const readOnly = requireWritableOrg(authCtx.organizationId);
    if (readOnly) return readOnly;
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

    // 3. Credit guard BEFORE any AI call. Cheaper failure path.
    //    Checks the SUM of the two balances, exactly as consumeCredits will:
    //    both plan and purchased credits are spendable, so an org sitting on 0
    //    plan credits and a paid pack can afford this and must not be refused.
    //    (This is only a cheap early exit — the real, atomic check is in
    //    consumeCredits at step 6.)
    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { aiCredits: true, aiCreditsPurchased: true, name: true, industry: true, employees: true },
    });
    if (org.aiCredits + org.aiCreditsPurchased < ANALYSIS_CREDIT_COST) {
      return fail('INSUFFICIENT_CREDITS', 402);
    }

    // 4. Configuration guard: no API key → 503 with a clear message.
    if (!isAnthropicConfigured()) {
      return fail(MISSING_KEY_MESSAGE, 503);
    }

    // 5. Call the AI. If this throws, we fall through to the catch and DO NOT
    //    decrement credits.
    const analysis = await analyzeAlert(
      {
        title: alert.title,
        description: alert.description,
        severity: alert.severity,
        recommendation: alert.recommendation,
        source: alert.source,
      },
      { name: org.name, industry: org.industry, employees: org.employees },
    );

    // 6. Persist the result, then decrement credits atomically. If the org ran
    //    out of credits between the check above and now, consumeCredits throws
    //    InsufficientCreditsError and we surface 402 without having persisted a
    //    paid result.
    let creditsRemaining: number;
    try {
      creditsRemaining = (await consumeCredits(organizationId, ANALYSIS_CREDIT_COST)).remaining;
    } catch (e) {
      if (e instanceof InsufficientCreditsError) return fail('INSUFFICIENT_CREDITS', 402);
      throw e;
    }

    await prisma.alert.update({
      where: { id: alert.id },
      data: { aiAnalysis: JSON.stringify(analysis) },
    });

    return ok({ ...analysis, cached: false, creditsRemaining });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
