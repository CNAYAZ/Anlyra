import type Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { getStripe } from '@/lib/stripe/client';
import { auditLog } from '@/lib/audit/log';
import { cardFingerprintOf, normalizedVatForRegister } from '@/lib/billing/trial-claims';
import { claimTrialStart, type TrialBlock } from '@/lib/billing/trial-eligibility';
import { TRIAL_CREDITS } from '@/lib/billing/trial-rule';

export type TrialStartOutcome =
  | { outcome: 'started' }
  | { outcome: 'already-recorded' }
  | { outcome: 'denied'; reason: TrialBlock; subscription: Stripe.Subscription };

/**
 * A checkout that offered a trial has completed and Stripe reports the
 * subscription as "trialing". Only now is the card known, so this is where the
 * card rule applies (founder's decision: a card that has already had a trial is
 * recognised only after it has been entered):
 *  • the trial may start → it is recorded in the register (claimTrialStart) and
 *    the company receives TRIAL_CREDITS, once;
 *  • it may not (the card has had a trial, or in a race another company with
 *    the same VAT number started one first, or there is no valid VAT number to
 *    check) → the trial is ended NOW on Stripe, which charges the first period
 *    at once; an audit row records why. The caller tells the customer.
 *
 * Safe to repeat for the same subscription (a retried webhook): a subscription
 * already recorded in the register is left alone, so a retry can neither end a
 * trial that started nor give the credits twice.
 */
export async function applyTrialStart(params: {
  organizationId: string;
  subscription: Stripe.Subscription;
}): Promise<TrialStartOutcome> {
  const { organizationId, subscription } = params;

  const already = await prisma.trialClaim.findFirst({
    where: { stripeSubscriptionId: subscription.id },
    select: { id: true },
  });
  if (already) return { outcome: 'already-recorded' };

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { vatNumber: true },
  });
  const vatNumber = normalizedVatForRegister(org?.vatNumber);
  const cardFingerprint = cardFingerprintOf(subscription);
  if (!cardFingerprint) {
    console.warn(
      `[trial] Stripe returned no card fingerprint for subscription ${subscription.id} (org ${organizationId}): the card rule cannot be applied`,
    );
  }

  const claim = vatNumber
    ? await claimTrialStart({
        organizationId,
        vatNumber,
        cardFingerprint,
        stripeSubscriptionId: subscription.id,
        credits: TRIAL_CREDITS,
      })
    : { started: false, blockedBy: 'vat' as const };

  // The trial credits were given inside claimTrialStart's transaction.
  if (claim.started) return { outcome: 'started' };

  const reason = claim.blockedBy ?? 'vat';
  const ended = await getStripe().subscriptions.update(subscription.id, {
    trial_end: 'now',
    proration_behavior: 'none',
  });
  await auditLog({
    action: 'billing.trial_denied',
    organizationId,
    targetType: 'subscription',
    targetId: subscription.id,
    metadata: { reason },
  });
  console.info(`[trial] org ${organizationId}: trial ended at once (${reason}), subscription ${subscription.id} is now ${ended.status}`);
  return { outcome: 'denied', reason, subscription: ended };
}
