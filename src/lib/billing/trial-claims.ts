import type Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { isValidItalianVat } from '@/lib/billing/billing-details';
import { DEMO_ORG_ID } from '@/lib/session';

/**
 * THE REGISTER OF FREE TRIALS (TrialClaim) — writing, filling and expiry.
 *
 * Founder's decisions (2026-09-30):
 *  • one trial per card, per VAT number and per company;
 *  • VAT number and card fingerprint kept 24 months, IP 12 months, from the
 *    activation of the trial or the attempt (TrialClaim.claimedAt);
 *  • the IP is only a signal shown to the founder, never an automatic refusal;
 *  • a person can review a row and grant the trial anyway (art. 22 GDPR).
 *
 * This file RECORDS. The check that refuses a trial is the next step and does
 * not exist yet; when it does, it must honour TrialClaim.reviewGrantedAt.
 *
 * Every write here is best effort for the caller: a payment must never fail
 * because the register could not be written. Failures are logged under
 * [trial-claim].
 */

/** IP kept 12 months, the row (VAT number, card fingerprint) 24 months. */
export const TRIAL_CLAIM_IP_RETENTION_MONTHS = 12;
export const TRIAL_CLAIM_RETENTION_MONTHS = 24;
/** The IP inside a Terms-acceptance audit row is cleared after 12 months; the row stays. */
export const TERMS_ACCEPTANCE_IP_RETENTION_MONTHS = 12;

/** Calendar months back from `now`, the same way the audit retention counts them. */
function monthsBefore(now: Date, months: number): Date {
  const d = new Date(now.getTime());
  d.setUTCMonth(d.getUTCMonth() - months);
  return d;
}

/** getClientIp's placeholder for "no IP known" is not an IP. */
function realIp(ip: string | null | undefined): string | null {
  return ip && ip !== 'unknown' ? ip : null;
}

/**
 * At the start of a subscription checkout: the attempt, with the VAT number and
 * the IP of the request. The FIRST row for a VAT number stays: a second
 * checkout, from this company or another, changes nothing (ON CONFLICT DO
 * NOTHING — one statement, so two simultaneous checkouts cannot both insert).
 */
export async function recordTrialClaimAttempt(params: {
  organizationId: string;
  vatNumber: string;
  ip: string | null;
}): Promise<void> {
  try {
    await prisma.$executeRaw`
      INSERT INTO "TrialClaim" ("id", "vatNumber", "organizationId", "ip", "claimedAt", "source", "updatedAt")
      VALUES (gen_random_uuid()::text, ${params.vatNumber}, ${params.organizationId}, ${realIp(params.ip)}, now(), 'checkout', now())
      ON CONFLICT ("vatNumber") DO NOTHING
    `;
  } catch (err) {
    console.error(`[trial-claim] attempt NOT recorded for org ${params.organizationId}:`, err);
  }
}

/**
 * At checkout.session.completed: the card fingerprint and the subscription id
 * go on the row this company's attempt wrote, and claimedAt moves to the
 * activation. Touches ONLY a row of the same company that has no subscription
 * yet — the first row for a VAT number is never taken over by another company,
 * and a completed row is never rewritten. If the attempt was never recorded
 * (its insert failed), the row is created here, without an IP.
 */
export async function completeTrialClaim(params: {
  organizationId: string;
  vatNumber: string;
  stripeSubscriptionId: string | null;
  cardFingerprint: string | null;
}): Promise<void> {
  try {
    await prisma.$executeRaw`
      INSERT INTO "TrialClaim" ("id", "vatNumber", "organizationId", "stripeSubscriptionId", "cardFingerprint", "claimedAt", "source", "updatedAt")
      VALUES (gen_random_uuid()::text, ${params.vatNumber}, ${params.organizationId}, ${params.stripeSubscriptionId}, ${params.cardFingerprint}, now(), 'checkout', now())
      ON CONFLICT ("vatNumber") DO UPDATE SET
        "stripeSubscriptionId" = EXCLUDED."stripeSubscriptionId",
        "cardFingerprint" = COALESCE("TrialClaim"."cardFingerprint", EXCLUDED."cardFingerprint"),
        "claimedAt" = now(),
        "updatedAt" = now()
      WHERE "TrialClaim"."organizationId" = EXCLUDED."organizationId"
        AND "TrialClaim"."stripeSubscriptionId" IS NULL
    `;
  } catch (err) {
    console.error(`[trial-claim] completion NOT recorded for org ${params.organizationId}:`, err);
  }
}

/**
 * The card fingerprint of a subscription's default payment method, from a
 * subscription retrieved with expand: ['default_payment_method']. null when
 * Stripe did not give one (not expanded, not a card, no method) — the payment
 * goes on regardless and the caller logs it.
 */
export function cardFingerprintOf(sub: Stripe.Subscription | null): string | null {
  const pm = sub?.default_payment_method;
  if (!pm || typeof pm === 'string') return null;
  return pm.card?.fingerprint ?? null;
}

/**
 * A stored Organization.vatNumber as the register keys it, or null when it is
 * not a valid Italian VAT number. The column was free text at onboarding before
 * it was validated, so an "IT" prefix and spaces are tolerated.
 */
export function normalizedVatForRegister(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\s+/g, '').toUpperCase().replace(/^IT/, '');
  return isValidItalianVat(digits) ? digits : null;
}

/**
 * The companies that already had a trial, as they would enter the register:
 * a trial start date, a valid VAT number, not the demo (excluded by id). The
 * earliest trial comes first, so when two companies share a VAT number the
 * first one is the one that stays.
 */
export async function trialClaimBackfillCandidates(): Promise<
  { organizationId: string; vatNumber: string; claimedAt: Date }[]
> {
  const orgs = await prisma.organization.findMany({
    where: { trialStartedAt: { not: null }, id: { not: DEMO_ORG_ID } },
    orderBy: { trialStartedAt: 'asc' },
    select: { id: true, vatNumber: true, trialStartedAt: true },
  });
  const out: { organizationId: string; vatNumber: string; claimedAt: Date }[] = [];
  for (const o of orgs) {
    const vat = normalizedVatForRegister(o.vatNumber);
    if (vat) out.push({ organizationId: o.id, vatNumber: vat, claimedAt: o.trialStartedAt as Date });
  }
  return out;
}

/**
 * Fills the register from the companies that already had a trial, as "trial
 * already used" (source 'backfill', no card, no IP). Safe to run more than once:
 * a VAT number already in the register is left as it is.
 */
export async function backfillTrialClaims(): Promise<{ candidates: number; inserted: number }> {
  const candidates = await trialClaimBackfillCandidates();
  let inserted = 0;
  for (const c of candidates) {
    inserted += await prisma.$executeRaw`
      INSERT INTO "TrialClaim" ("id", "vatNumber", "organizationId", "claimedAt", "source", "updatedAt")
      VALUES (gen_random_uuid()::text, ${c.vatNumber}, ${c.organizationId}, ${c.claimedAt}, 'backfill', now())
      ON CONFLICT ("vatNumber") DO NOTHING
    `;
  }
  return { candidates: candidates.length, inserted };
}

/**
 * The three expiries, on the nightly gdpr-purge run:
 *  • TrialClaim.ip cleared 12 months after claimedAt;
 *  • TrialClaim rows deleted 24 months after claimedAt;
 *  • the ip of every 'auth.terms_accepted' audit row cleared 12 months after
 *    it was written — the row itself stays (it is the proof of acceptance and
 *    is exempt from the audit retention).
 * Each filter is `< cutoff`, so nothing inside its window can be caught.
 */
export async function purgeTrialClaimData(now: Date = new Date()): Promise<{
  trialClaimIpsCleared: number;
  trialClaimsDeleted: number;
  termsAcceptanceIpsCleared: number;
}> {
  const ipCutoff = monthsBefore(now, TRIAL_CLAIM_IP_RETENTION_MONTHS);
  const rowCutoff = monthsBefore(now, TRIAL_CLAIM_RETENTION_MONTHS);
  const termsIpCutoff = monthsBefore(now, TERMS_ACCEPTANCE_IP_RETENTION_MONTHS);

  const deleted = await prisma.trialClaim.deleteMany({ where: { claimedAt: { lt: rowCutoff } } });
  const ipsCleared = await prisma.trialClaim.updateMany({
    where: { claimedAt: { lt: ipCutoff }, ip: { not: null } },
    data: { ip: null },
  });
  const termsIps = await prisma.auditLog.updateMany({
    where: { action: 'auth.terms_accepted', createdAt: { lt: termsIpCutoff }, ip: { not: null } },
    data: { ip: null },
  });
  return {
    trialClaimIpsCleared: ipsCleared.count,
    trialClaimsDeleted: deleted.count,
    termsAcceptanceIpsCleared: termsIps.count,
  };
}
