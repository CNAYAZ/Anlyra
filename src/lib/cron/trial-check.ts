import { prisma } from '@/lib/prisma';
import { siteUrl } from '@/lib/auth/tokens';
import {
  sendEmail,
  trialThreeDaysTemplate,
  trialOneDayTemplate,
  trialExpiredTemplate,
} from '@/lib/email';

const DAY_MS = 24 * 60 * 60 * 1000;

const PLAN_LABEL: Record<string, { name: string; amount: string }> = {
  PRO: { name: 'PRO', amount: '€49' },
  ADVANCED: { name: 'Avanzato', amount: '€149' },
  ENTERPRISE: { name: 'Enterprise', amount: '—' },
};

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
}

export async function runTrialCheck(now = new Date()): Promise<TrialCheckResult> {
  const result: TrialCheckResult = { threeDays: 0, oneDay: 0, expired: 0 };

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
    const plan = PLAN_LABEL[org.plan] || PLAN_LABEL.PRO;
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
