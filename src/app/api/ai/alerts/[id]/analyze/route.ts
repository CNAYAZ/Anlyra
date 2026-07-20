import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/session';
import { isAnthropicConfigured, MISSING_KEY_MESSAGE } from '@/lib/ai/client';
import { consumeCredits, InsufficientCreditsError } from '@/lib/credits';
import { analyzeAlert, parseStoredAnalysis } from '@/lib/alerts/ai-analysis';
import { requireActiveAccess } from '@/lib/billing/server-gate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Credits charged per AI alert analysis. Aligned with the insights pattern.
const ANALYSIS_CREDIT_COST = 1;

export async function POST(_req: Request, ctx: { params: { id: string } }) {
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) return fail('Unauthorized', 401);
    const { organizationId } = authCtx;

    // 1. Ownership: alert must exist and belong to the current org.
    const alert = await prisma.alert.findFirst({
      where: { id: ctx.params.id, organizationId },
    });
    if (!alert) return fail('NOT_FOUND', 404);

    // 2. Cache: return a previously generated analysis without calling the AI
    //    (and without charging credits again).
    const cached = parseStoredAnalysis(alert.aiAnalysis);
    if (cached) {
      return ok({ ...cached, cached: true });
    }

    // Trial/subscription gate: block a NEW (credit-charging) AI analysis for an
    // expired trial. Placed AFTER the cache check so an already-generated analysis
    // stays readable (read-only access), but no new AI call is ever made.
    const access = await requireActiveAccess(organizationId);
    if (!access.allowed) return fail('TRIAL_EXPIRED', 402);

    // 3. Credit guard BEFORE any AI call. Cheaper failure path.
    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { aiCredits: true, name: true, industry: true, employees: true },
    });
    if (org.aiCredits < ANALYSIS_CREDIT_COST) {
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
      creditsRemaining = await consumeCredits(organizationId, ANALYSIS_CREDIT_COST);
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
