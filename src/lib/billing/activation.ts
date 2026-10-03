import { prisma } from '@/lib/prisma';
import { getSubscription } from '@/lib/billing/repository';
import { DEMO_ORG_ID } from '@/lib/session';

/** The page a company that has never entered a card is sent to (outside the dashboard). */
export const ACTIVATION_PATH = '/activate';

/**
 * A company that has NEVER entered a card (founder's decision, 2026-10-03: no
 * card, no access to the product; data export and account deletion stay
 * available). True only when ALL of these hold:
 *  • no Stripe subscription recorded, and the status is "canceled" (no
 *    subscription) — a plan assigned by hand from the admin panel is "active";
 *  • no old local trial (Organization.trialStartedAt): companies created
 *    before the trial with a card keep the old rules — a local trial still
 *    running gives access, an expired one is read-only, as before;
 *  • no trial with a card ever started (a started row in the register) and no
 *    invoice ever recorded — a company that had a subscription and cancelled
 *    it is NOT "never activated": it keeps the read-only access it had.
 * Never the demo.
 */
export async function needsActivation(organizationId: string): Promise<boolean> {
  if (organizationId === DEMO_ORG_ID) return false;
  const sub = await getSubscription(organizationId);
  if (sub.stripeSubscriptionId || sub.status !== 'canceled') return false;
  const [org, startedTrials, invoices] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId }, select: { trialStartedAt: true } }),
    prisma.trialClaim.count({
      where: { organizationId, OR: [{ stripeSubscriptionId: { not: null } }, { source: 'backfill' }] },
    }),
    prisma.billingInvoice.count({ where: { organizationId } }),
  ]);
  if (!org || org.trialStartedAt) return false;
  return startedTrials === 0 && invoices === 0;
}
