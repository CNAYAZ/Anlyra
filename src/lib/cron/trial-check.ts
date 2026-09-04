import { prisma } from '@/lib/prisma';
import { siteUrl } from '@/lib/auth/tokens';
import { getSubscription } from '@/lib/billing/repository';
import { PLANS, type PlanId } from '@/lib/billing/plans';
import { formatCurrency } from '@/lib/format';
import itMessages from '@/messages/it.json';
import {
  sendEmail,
  trialThreeDaysTemplate,
  trialOneDayTemplate,
  trialExpiredTemplate,
} from '@/lib/email';

const DAY_MS = 24 * 60 * 60 * 1000;

type PlanEmailInfo = { name: string; amount: string };

/**
 * The plan's real display name and monthly price, in Italian — matching the
 * hardcoded 'it-IT' already used throughout this file (fmtDate, every email
 * subject below). Sourced from the same listing the rest of the app uses
 * (PLANS in src/lib/billing/plans.ts, prices in cents) and the same message
 * catalog the billing page reads plan names from
 * (billing.plans.<id>.name in src/messages/it.json) — not a hand-typed copy
 * that can drift from either, which is what this replaces.
 *
 * Returns null — never a guessed name or an invented price — when:
 *   • `planId` is not a known PlanId (an unexpected value on
 *     BillingSubscription.plan), or
 *   • the plan has no real self-serve monthly price (ENTERPRISE is priced at
 *     0 cents in PLANS as a "contact us" placeholder, not a recoverable
 *     amount to put in a "you will be charged X" email).
 * The caller must not send an email in either case — the same rule
 * credit-renewal.ts already follows for an unknown plan string
 * (skippedUnknownPlan), applied here so a bad or unpriced plan value can
 * never put a wrong number in front of a customer.
 */
function resolvePlanEmailInfo(planId: string): PlanEmailInfo | null {
  const plan = PLANS[planId as PlanId];
  if (!plan) return null;
  if (plan.pricing.monthlyCents <= 0) return null;
  const key = planId.toLowerCase() as 'pro' | 'advanced' | 'enterprise';
  const name = itMessages.billing.plans[key]?.name;
  if (!name) return null;
  return { name, amount: formatCurrency(plan.pricing.monthlyCents / 100, 'it') };
}

/**
 * BillingSubscription statuses that mean "this organization has ALREADY
 * converted to a paid plan". Nothing below this must ever send a trial email
 * to one of these orgs, no matter what Organization.trialEndsAt still says —
 * trialEndsAt is written once at onboarding and nothing resets it today (see
 * COMMIT 2 in the branch history for the fix to that), so it can be stale and
 * still non-null for an organization that subscribed days or weeks ago.
 *
 *   • "active"   — converted and currently paying. The direct case this bug
 *     report is about: someone who subscribes mid-trial keeps getting "3 days
 *     left", "domani ti addebitiamo 49€", "prova scaduta" regardless.
 *   • "past_due" — ALSO already converted: a real BillingSubscription row
 *     exists, they went through checkout once. Stripe's own dunning flow
 *     already emails them about the failed charge; layering "your trial is
 *     ending, upgrade now" on top would contradict what Stripe just told the
 *     same person and imply Anlyra doesn't know they already subscribed.
 *
 * Deliberately NOT included: "canceled". That status is ALSO what
 * defaultSubscription() (src/lib/billing/repository.ts) synthesizes for an
 * organization with NO BillingSubscription row at all, once its trial has run
 * out without ever paying — i.e. exactly the intended audience for
 * "prova scaduta — riattiva". Treating "canceled" as "has paid" here would
 * silence that email for the population it exists to reach. A genuinely
 * canceled real subscription (one that WAS active and then churned) is a
 * narrower, separate case, addressed by nulling trialEndsAt the moment an
 * organization first goes active (see COMMIT 2) rather than by adding
 * "canceled" to this list.
 */
const PAID_STATUSES = ['active', 'past_due'];

function fmtDate(d: Date, locale = 'it-IT'): string {
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
}

async function orgAdminEmails(organizationId: string): Promise<{ email: string; name: string }[]> {
  const memberships = await prisma.membership.findMany({
    where: { organizationId, role: { in: ['admin', 'owner'] } },
    include: { user: { select: { email: true, name: true } } },
  });
  return memberships
    .filter((m) => m.user?.email)
    .map((m) => ({ email: m.user!.email, name: m.user!.name || m.user!.email }));
}

export interface TrialCheckResult {
  threeDays: number;
  oneDay: number;
  expired: number;
  /** Plan string on BillingSubscription had no recoverable name/price — see resolvePlanEmailInfo. */
  skippedUnknownPlan: number;
}

export async function runTrialCheck(now = new Date()): Promise<TrialCheckResult> {
  const result: TrialCheckResult = { threeDays: 0, oneDay: 0, expired: 0, skippedUnknownPlan: 0 };

  const orgs = await prisma.organization.findMany({
    where: { trialEndsAt: { not: null } },
    select: { id: true, name: true, plan: true, trialEndsAt: true },
  });

  // Bulk lookup, not one query per org: which of these candidates already have
  // a paying (or paying-but-failing) subscription. See PAID_STATUSES above for
  // exactly which statuses count and why "canceled" is deliberately excluded.
  const paidOrgIds = new Set(
    (
      await prisma.billingSubscription.findMany({
        where: { organizationId: { in: orgs.map((o) => o.id) }, status: { in: PAID_STATUSES } },
        select: { organizationId: true },
      })
    ).map((s) => s.organizationId),
  );

  const upgradeUrl = `${siteUrl()}/it/settings/billing`;
  const reactivateUrl = upgradeUrl;
  const cancelUrl = upgradeUrl;
  const exportUrl = `${siteUrl()}/it/settings/billing`;

  for (const org of orgs) {
    // Already converted (or converted-but-currently-failing) — no trial email,
    // ever, whatever a stale trialEndsAt still says. This alone is the fix for
    // the bug: an organization that subscribes mid-trial stops receiving
    // trial-ending/trial-expired emails from the very next cron run, with no
    // dependency on trialEndsAt ever being corrected.
    if (paidOrgIds.has(org.id)) continue;
    if (!org.trialEndsAt) continue;
    const msLeft = org.trialEndsAt.getTime() - now.getTime();
    const daysLeft = Math.ceil(msLeft / DAY_MS);

    // Real plan name/price, from BillingSubscription — never Organization.plan
    // (the legacy column, default "STARTER", not a valid plan id). getSubscription()
    // also covers "no subscription row yet" (a genuinely still-trialing org): it
    // synthesizes plan "PRO" there (src/lib/billing/repository.ts,
    // defaultSubscription) — the SAME fallback getBillingState() and
    // requireActiveAccess already use everywhere else in the app, not a new one
    // invented for this file.
    const sub = await getSubscription(org.id);
    const plan = resolvePlanEmailInfo(sub.plan);
    if (!plan) {
      // Unknown or unpriced plan value — mirrors credit-renewal.ts's handling of
      // an unknown plan string: skip loudly, never guess a name or a price.
      result.skippedUnknownPlan++;
      console.warn(
        `[trial-check] org ${org.id}: plan "${sub.plan}" has no recoverable name/price — trial email skipped.`,
      );
      continue;
    }

    const recipients = await orgAdminEmails(org.id);
    if (recipients.length === 0) continue;

    for (const r of recipients) {
      if (msLeft <= 0 && msLeft > -DAY_MS) {
        // Expired within the last day → send once.
        await sendEmail({
          to: r.email,
          subject: 'Prova scaduta — riattiva il tuo account · Anlyra',
          html: trialExpiredTemplate({
            userName: r.name,
            userEmail: r.email,
            expiredAt: fmtDate(org.trialEndsAt),
            reactivateUrl,
            exportUrl,
          }),
        }).catch(() => {});
        result.expired++;
      } else if (daysLeft === 1) {
        await sendEmail({
          to: r.email,
          subject: 'Domani inizia il tuo piano · Anlyra',
          html: trialOneDayTemplate({
            userName: r.name,
            userEmail: r.email,
            billingDate: fmtDate(org.trialEndsAt),
            billingAmount: plan.amount,
            planName: plan.name,
            upgradeUrl,
            cancelUrl,
          }),
        }).catch(() => {});
        result.oneDay++;
      } else if (daysLeft > 1 && daysLeft <= 3) {
        await sendEmail({
          to: r.email,
          subject: `${daysLeft} giorni alla fine della prova · Anlyra`,
          html: trialThreeDaysTemplate({
            userName: r.name,
            userEmail: r.email,
            daysRemaining: daysLeft,
            planName: plan.name,
            upgradeUrl,
            billingDate: fmtDate(org.trialEndsAt),
          }),
        }).catch(() => {});
        result.threeDays++;
      }
    }
  }

  return result;
}
