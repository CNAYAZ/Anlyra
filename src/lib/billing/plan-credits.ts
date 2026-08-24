import { PLANS, isUnlimited, type PlanId } from './plans';

/**
 * How many AI credits a plan is worth for ONE billing period.
 *
 * Single source of truth for "what should this org's balance be", used by both
 * org creation (initial allocation) and the monthly renewal in the cron. The
 * numbers themselves are NOT duplicated here — they are read from PLANS
 * (src/lib/billing/plans.ts), so raising ADVANCED from 700 stays a one-line
 * change in one file.
 *
 * ENTERPRISE is stored as -1 ("unlimited") in PLANS. There is no infinite Int to
 * put in Organization.aiCredits, so an unlimited plan is materialised as a large
 * finite grant refreshed every period. This is NOT a product decision about what
 * unlimited means — it is the smallest honest way to represent it with the
 * current schema, where consumeCredits always decrements a concrete number. If
 * the founder wants true unlimited, the right fix is a plan check inside
 * consumeCredits, not a bigger number here.
 */
const ENTERPRISE_PERIOD_CREDITS = 100_000;

/**
 * Credits granted to `plan` for one billing period.
 *
 * Accepts the raw string stored on BillingSubscription.plan / Organization.plan
 * rather than a PlanId, because the database can legitimately hold values that
 * are not valid plan ids — most notably the schema's own
 * `Organization.plan @default("STARTER")`, a legacy default with no entry in
 * PLANS. An unknown plan returns null so the caller can decide (skip the org,
 * fall back) instead of crashing on a PLANS[undefined] lookup.
 */
export function creditsForPlan(plan: string | null | undefined): number | null {
  if (!plan) return null;
  const known = PLANS[plan as PlanId];
  if (!known) return null;
  const limit = known.limits.aiCredits;
  return isUnlimited(limit) ? ENTERPRISE_PERIOD_CREDITS : limit;
}

/**
 * The plan a brand-new organization starts on.
 *
 * Deliberately PRO, matching what billing already assumes elsewhere: a new org
 * gets a trial, and defaultSubscription() in billing/repository.ts reports that
 * trial as `plan: "PRO", status: "trialing"`. Granting PRO's credits keeps the
 * balance consistent with the plan the rest of the app believes the org is on
 * during its trial.
 */
export const SIGNUP_PLAN: PlanId = 'PRO';

/** Credits a brand-new organization starts with. */
export function signupCredits(): number {
  // creditsForPlan(SIGNUP_PLAN) is a known plan, so this never falls back —
  // the ?? is only here to satisfy the null-returning signature above.
  return creditsForPlan(SIGNUP_PLAN) ?? 0;
}
