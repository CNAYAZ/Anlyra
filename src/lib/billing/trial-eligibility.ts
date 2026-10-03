import { prisma } from '@/lib/prisma';

/**
 * WHO MAY HAVE A FREE TRIAL — the one place that decides it.
 *
 * Founder's decisions (2026-10-03):
 *  • one trial per VAT number, per card and per company;
 *  • only trials that really STARTED count. The register writes a row as an
 *    "attempt" as soon as a checkout opens (recordTrialClaimAttempt): an attempt
 *    — a checkout opened and abandoned, or paid without a trial — never counts;
 *  • a row a person reviewed and granted ("rivista, prova concessa") does not
 *    count, for ONE trial: when that trial starts the grant is used
 *    (reviewGrantUsedAt) and the row counts again;
 *  • for the company, the old local trial (Organization.trialStartedAt) counts
 *    too. A company with no row in the register cannot be unblocked by a
 *    review: it pays without a trial (accepted by the founder).
 *
 * Used twice: BEFORE the payment (without the card, which is only known after
 * it has been entered) to decide whether the checkout offers a trial and to
 * tell the customer that their VAT number has already had one; and when the
 * checkout completes (with the card), through claimTrialStart, which re-checks
 * and records the trial in one step.
 */

export type TrialBlock = 'company' | 'vat' | 'card';

type ClaimRow = {
  id: string;
  vatNumber: string;
  organizationId: string;
  cardFingerprint: string | null;
  stripeSubscriptionId: string | null;
  source: string;
  reviewGrantedAt: Date | null;
  reviewGrantUsedAt: Date | null;
};

/** A trial really started from this row: a filled-in old trial, or a subscription recorded on it. */
function started(r: ClaimRow): boolean {
  return r.source === 'backfill' || r.stripeSubscriptionId !== null;
}

/** A reviewed row whose grant has not been used yet. */
function openGrant(r: ClaimRow): boolean {
  return started(r) && r.reviewGrantedAt !== null && r.reviewGrantUsedAt === null;
}

/** A row that makes the trial "already used". */
function counts(r: ClaimRow): boolean {
  return started(r) && !openGrant(r);
}

export type TrialEligibility = {
  eligible: boolean;
  /** The first reason found, in this order: company, VAT number, card. */
  blockedBy: TrialBlock | null;
  /** Reviewed rows whose grant this trial would use. */
  grantRowIds: string[];
};

export async function trialEligibility(params: {
  organizationId: string;
  vatNumber: string;
  cardFingerprint?: string | null;
}): Promise<TrialEligibility> {
  const { organizationId, vatNumber, cardFingerprint } = params;
  const [org, rows] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId }, select: { trialStartedAt: true } }),
    prisma.trialClaim.findMany({
      where: {
        OR: [
          { vatNumber },
          { organizationId },
          ...(cardFingerprint ? [{ cardFingerprint }] : []),
        ],
      },
      select: {
        id: true,
        vatNumber: true,
        organizationId: true,
        cardFingerprint: true,
        stripeSubscriptionId: true,
        source: true,
        reviewGrantedAt: true,
        reviewGrantUsedAt: true,
      },
    }),
  ]);

  const byCompany = rows.filter((r) => r.organizationId === organizationId);
  const byVat = rows.filter((r) => r.vatNumber === vatNumber);
  const byCard = cardFingerprint ? rows.filter((r) => r.cardFingerprint === cardFingerprint) : [];

  let blockedBy: TrialBlock | null = null;
  if (org?.trialStartedAt || byCompany.some(counts)) blockedBy = 'company';
  else if (byVat.some(counts)) blockedBy = 'vat';
  else if (byCard.some(counts)) blockedBy = 'card';

  const grantRowIds = blockedBy ? [] : [...new Set([...byCompany, ...byVat, ...byCard].filter(openGrant).map((r) => r.id))];
  return { eligible: blockedBy === null, blockedBy, grantRowIds };
}

/**
 * When a checkout that offered a trial completes, with the card now known:
 * re-checks, and if the trial may start, records it in the register — the
 * company's attempt row (or a new row) becomes a started trial, and any
 * reviewed grant it relies on is marked as used.
 *
 * Returns started: false with the reason when the trial must NOT start (the
 * card has already had one, or — in a race — another company with the same
 * VAT number started one in the meantime); the caller then ends the trial.
 *
 * The VAT row is taken over only while it is an attempt (no subscription,
 * not filled from the old trials): that UPDATE is one statement, so of two
 * companies racing for the same VAT number only one can start a trial.
 */
export async function claimTrialStart(params: {
  organizationId: string;
  vatNumber: string;
  cardFingerprint: string | null;
  stripeSubscriptionId: string;
}): Promise<{ started: boolean; blockedBy: TrialBlock | null }> {
  const check = await trialEligibility(params);
  if (!check.eligible) return { started: false, blockedBy: check.blockedBy };

  const { organizationId, vatNumber, cardFingerprint, stripeSubscriptionId } = params;
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    if (check.grantRowIds.length > 0) {
      await tx.trialClaim.updateMany({
        where: { id: { in: check.grantRowIds }, reviewGrantUsedAt: null },
        data: { reviewGrantUsedAt: now },
      });
    }
    const written = await tx.$executeRaw`
      INSERT INTO "TrialClaim" ("id", "vatNumber", "organizationId", "stripeSubscriptionId", "cardFingerprint", "claimedAt", "source", "updatedAt")
      VALUES (gen_random_uuid()::text, ${vatNumber}, ${organizationId}, ${stripeSubscriptionId}, ${cardFingerprint}, ${now}, 'checkout', ${now})
      ON CONFLICT ("vatNumber") DO UPDATE SET
        "organizationId" = EXCLUDED."organizationId",
        "stripeSubscriptionId" = EXCLUDED."stripeSubscriptionId",
        "cardFingerprint" = COALESCE(EXCLUDED."cardFingerprint", "TrialClaim"."cardFingerprint"),
        "ip" = CASE WHEN "TrialClaim"."organizationId" = EXCLUDED."organizationId" THEN "TrialClaim"."ip" ELSE NULL END,
        "claimedAt" = EXCLUDED."claimedAt",
        "updatedAt" = EXCLUDED."updatedAt"
      WHERE "TrialClaim"."stripeSubscriptionId" IS NULL AND "TrialClaim"."source" <> 'backfill'
    `;
    if (written === 1) return { started: true, blockedBy: null };
    // The VAT row is a started trial. Fine only if it is the reviewed row whose
    // grant this trial has just used — then that row is its record (with the
    // card, if the row had none).
    const vatRow = await tx.trialClaim.findUnique({ where: { vatNumber } });
    if (vatRow && check.grantRowIds.includes(vatRow.id)) {
      if (!vatRow.cardFingerprint && cardFingerprint) {
        await tx.trialClaim.update({ where: { id: vatRow.id }, data: { cardFingerprint } });
      }
      return { started: true, blockedBy: null };
    }
    throw new TrialRaceLost();
  }).catch((e) => {
    if (e instanceof TrialRaceLost) return { started: false, blockedBy: 'vat' as const };
    throw e;
  });
}

/** Rolls the transaction back (the grant must not be used) when another company won the VAT number. */
class TrialRaceLost extends Error {}
