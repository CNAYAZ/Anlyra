import { prisma } from '@/lib/prisma';
import { toAppDateString } from '@/lib/timezone';
import { creditsForPlan } from '@/lib/billing/plan-credits';
import { auditLog } from '@/lib/audit/log';

/**
 * Monthly AI-credit renewal.
 *
 * Called from /api/cron/trial-check, not its own cron entry: Vercel Hobby allows
 * at most 2 crons and both slots are already taken (trial-check, gdpr-purge).
 * Same reasoning — and the same isolation — as runScheduledReports().
 *
 * ── FOUNDER'S RULE: RESET, NOT ACCUMULATE ──
 * At renewal the balance is SET to the plan's allowance, it is not incremented.
 * An org that used 5 of 200 credits starts the new period at 200, not 395.
 * Unused credits expire; that is the decision, and it is why this writes an
 * absolute value (`set`) rather than an `increment`.
 *
 * ── WHO IS RENEWED ──
 * Only orgs with a subscription row whose status is "active". Everything else is
 * deliberately left alone:
 *   • "trialing" — a trial gets its allowance once, at signup (see
 *     plan-credits.signupCredits). Renewing a trial monthly would turn a 7-day
 *     trial into an unlimited free plan for anyone who never converts.
 *   • "canceled" / "past_due" — already blocked from spending credits by
 *     requireActiveAccess (billing/server-gate.ts). Topping up a balance the org
 *     cannot spend would be pointless; topping up one that later reactivates
 *     would be giving away a period for free.
 *   • orgs with NO subscription row at all — these are trials (see
 *     defaultSubscription in billing/repository.ts), covered by the first case.
 * NOTE FOR THE FOUNDER: "what happens to leftover credits when a subscription
 * lapses mid-period, and does a reactivated subscription get a fresh period
 * immediately?" is a commercial question this job does not answer — it simply
 * skips non-active subscriptions. Flagged rather than decided here.
 *
 * ── TIMING: WHY CALENDAR MONTHS, NOT TIMESTAMPS ──
 * Hobby fires the cron inside a ±1 hour window, so exact-time arithmetic drifts.
 * Due-ness is therefore "is the Europe/Rome calendar month of now different from
 * the calendar month of creditsRenewedAt?" (timezone.ts). Consequences, both
 * intentional:
 *   • Cannot double-grant: the moment a reset succeeds, creditsRenewedAt lands in
 *     the current month, so every later run that same month is a no-op —
 *     regardless of cron jitter or a manual re-trigger.
 *   • Cannot skip a month: if a run is missed entirely (outage), the comparison
 *     still reads "different month" on the next run and the reset happens then.
 *     A missed month is delayed, never lost.
 * The renewal day is thus "the first cron run of each calendar month", not the
 * subscription's own anniversary. That is a deliberate simplification: it is
 * predictable, immune to short-month edge cases (no "Feb 31" problem), and
 * matches how the scheduled-reports job already reasons about monthly cadence.
 */

/**
 * Caps how many subscriptions one invocation renews, mirroring
 * MAX_REPORTS_PER_RUN in scheduled-reports.ts. Each renewal is two small writes,
 * far cheaper than rendering a PDF, so the cap is higher — it exists to bound the
 * worst case inside the route's 60s budget, not because the work is heavy.
 * Anything beyond the cap is picked up by the next daily run: due-ness is
 * measured per-subscription against its own creditsRenewedAt, so nothing is
 * skipped, and the longest-overdue are processed first (see orderBy) so no org is
 * starved.
 */
const MAX_RENEWALS_PER_RUN = 200;

/** Statuses that receive a monthly grant. See "WHO IS RENEWED" above. */
const RENEWABLE_STATUSES = ['active'];

export interface CreditRenewalResult {
  /** Subscriptions examined (active, cap applied). */
  considered: number;
  /** Balances actually reset this run. */
  renewed: number;
  /** Already renewed this calendar month — nothing to do. */
  skippedAlreadyRenewed: number;
  /** Plan string not found in PLANS (e.g. the legacy "STARTER"). */
  skippedUnknownPlan: number;
  /** Threw while renewing; left for the next run. */
  failed: number;
}

/**
 * True when `renewedAt` falls in an earlier Europe/Rome calendar month than
 * `now`. NULL (never renewed) is due, so subscriptions that predate this feature
 * get their first reset on the next run.
 *
 * Compares "YYYY-MM" strings rather than doing month arithmetic — lexical
 * comparison of that format is chronological, and it sidesteps every
 * short-month/year-boundary edge case.
 */
export function isRenewalDue(renewedAt: Date | null, now: Date): boolean {
  if (!renewedAt) return true;
  return toAppDateString(now).slice(0, 7) > toAppDateString(renewedAt).slice(0, 7);
}

export async function runCreditRenewal(now = new Date()): Promise<CreditRenewalResult> {
  const result: CreditRenewalResult = {
    considered: 0,
    renewed: 0,
    skippedAlreadyRenewed: 0,
    skippedUnknownPlan: 0,
    failed: 0,
  };

  const subs = await prisma.billingSubscription.findMany({
    where: { status: { in: RENEWABLE_STATUSES } },
    select: { organizationId: true, plan: true, creditsRenewedAt: true },
    // Longest-overdue first (NULL = never renewed sorts first), so the cap
    // cannot starve the same subscriptions run after run.
    orderBy: { creditsRenewedAt: { sort: 'asc', nulls: 'first' } },
    take: MAX_RENEWALS_PER_RUN,
  });

  result.considered = subs.length;

  for (const sub of subs) {
    if (!isRenewalDue(sub.creditsRenewedAt, now)) {
      result.skippedAlreadyRenewed += 1;
      continue;
    }

    const allowance = creditsForPlan(sub.plan);
    if (allowance === null) {
      // Unknown plan string (legacy "STARTER", or a plan added to the DB but not
      // to PLANS). Skipped loudly rather than guessing an allowance — silently
      // picking a number here would be inventing a commercial rule.
      result.skippedUnknownPlan += 1;
      console.warn(
        `[credit-renewal] org ${sub.organizationId}: unknown plan "${sub.plan}" — skipped, balance untouched.`,
      );
      continue;
    }

    try {
      // Both writes in ONE transaction. If the marker write failed after the
      // balance write, the next run would reset the balance again (the org would
      // get a second full period); if the balance write failed after the marker,
      // the org would silently lose a period. Neither half is acceptable alone.
      await prisma.$transaction([
        prisma.organization.update({
          where: { id: sub.organizationId },
          // `set`, not `increment` — the founder's rule is reset, not accumulate.
          data: { aiCredits: { set: allowance } },
        }),
        prisma.billingSubscription.update({
          where: { organizationId: sub.organizationId },
          data: { creditsRenewedAt: now },
        }),
      ]);

      result.renewed += 1;

      // After the transaction: auditLog never throws (it swallows its own
      // errors), but a missing trail row must not make a completed renewal look
      // failed, so it stays outside the transaction either way.
      await auditLog({
        action: 'credits.monthly_renewal',
        organizationId: sub.organizationId,
        targetType: 'organization',
        targetId: sub.organizationId,
        // Non-sensitive context only: the plan and the allowance it grants.
        metadata: { plan: sub.plan, credits: allowance },
      });
    } catch (e) {
      // Left for the next run: creditsRenewedAt was not advanced, so the
      // subscription is still due tomorrow.
      result.failed += 1;
      console.error(`[credit-renewal] org ${sub.organizationId} failed:`, e);
    }
  }

  return result;
}
