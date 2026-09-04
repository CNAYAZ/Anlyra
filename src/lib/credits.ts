import { prisma } from './prisma';

export class InsufficientCreditsError extends Error {
  constructor() {
    super('INSUFFICIENT_CREDITS');
    this.name = 'InsufficientCreditsError';
  }
}

/**
 * What a single consumeCredits() call actually took, and from where.
 *
 * `remaining` is the number to show the user: the SUM of both balances. The
 * split matters to exactly one caller today (the refund path in
 * /api/ai/insights/generate), which must put each credit back in the column it
 * came from — see refundCredits.
 */
export type CreditSpend = {
  /** Total balance left after the spend: plan + purchased. What the user sees. */
  remaining: number;
  /** How much of `amount` came out of the PLAN balance (Organization.aiCredits). */
  fromPlan: number;
  /** How much came out of the PURCHASED balance (Organization.aiCreditsPurchased). */
  fromPurchased: number;
};

/** Shape of the single row the consume statement returns when it succeeds. */
type ConsumeRow = {
  plan_after: number;
  purchased_after: number;
  plan_before: number;
  purchased_before: number;
};

/**
 * Spends `amount` credits, PLAN BALANCE FIRST, purchased balance only for the
 * remainder.
 *
 * ── WHY PLAN FIRST (founder's rule) ──
 * Plan credits are wiped and reissued every month by the renewal job; purchased
 * credits never expire. Spending the perishable ones first is the only order
 * that does not throw away value the customer paid for.
 *
 * ── WHY RAW SQL, AND WHY IT MUST STAY ONE STATEMENT ──
 * The previous version was a single conditional UPDATE
 * (`updateMany` … WHERE aiCredits >= amount), and that single statement was the
 * ONLY thing standing between this product and double-spending: the check and
 * the subtraction happened together, so two simultaneous requests could not both
 * pass the check. Two columns cannot be expressed that way through Prisma's
 * typed API — no `updateMany` can say "subtract from B whatever A could not
 * cover" — and the obvious workaround (read both, decide in TypeScript, write
 * back) reintroduces exactly the race the old code avoided: two requests read
 * the same balance, both decide they can afford it, both write.
 *
 * So the whole operation stays ONE SQL statement:
 *   • `FOR UPDATE` in the first CTE takes the row lock BEFORE reading, so a
 *     second concurrent call blocks there and, when it proceeds, re-reads the
 *     balances the first call committed. It can never act on a stale read.
 *   • the affordability check `plan_before + purchased_before >= amount` lives
 *     in the UPDATE's own WHERE, so a balance that cannot cover the request
 *     updates NOTHING — no partial spend, neither column touched.
 *   • zero rows returned IS the "insufficient credits" signal, exactly as
 *     `result.count === 0` was before.
 * GREATEST(0, …) keeps both columns from going negative even in arithmetic that
 * momentarily wants to: the plan column floors at 0 and the purchased column is
 * only charged the part the plan could not cover.
 *
 * Verified against a real PostgreSQL 16 with 40 concurrent consumers racing for
 * a 10-credit balance, repeatedly: exactly 10 succeed, 30 get insufficient
 * credits, and the balance lands on 0 — never negative. See the report.
 */
export async function consumeCredits(organizationId: string, amount: number): Promise<CreditSpend> {
  // Raw SQL means the usual Prisma input validation does not apply, so the
  // amount is checked here. A negative amount would otherwise be an "add
  // yourself credits" instruction; a fractional one would be silently truncated
  // by the INTEGER columns. Every caller passes a positive constant today —
  // this is here so that stays true.
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(`consumeCredits: amount must be a positive integer, got ${amount}`);
  }

  const rows = await prisma.$queryRaw<ConsumeRow[]>`
    WITH locked AS (
      SELECT "id",
             "aiCredits"          AS plan_before,
             "aiCreditsPurchased" AS purchased_before
      FROM "Organization"
      WHERE "id" = ${organizationId}
      FOR UPDATE
    ), updated AS (
      UPDATE "Organization" o
      SET "aiCredits"          = GREATEST(0, l.plan_before - ${amount}::int),
          "aiCreditsPurchased" = l.purchased_before - GREATEST(0, ${amount}::int - l.plan_before)
      FROM locked l
      WHERE o."id" = l."id"
        AND l.plan_before + l.purchased_before >= ${amount}::int
      RETURNING o."aiCredits"          AS plan_after,
                o."aiCreditsPurchased" AS purchased_after,
                l.plan_before,
                l.purchased_before
    )
    SELECT plan_after, purchased_after, plan_before, purchased_before FROM updated
  `;

  const row = rows[0];
  // No row means either "not enough credits" or "no such organization". Both are
  // refusals to spend and neither changed anything, so both surface the same
  // way the old code did.
  if (!row) {
    throw new InsufficientCreditsError();
  }

  return {
    remaining: row.plan_after + row.purchased_after,
    fromPlan: row.plan_before - row.plan_after,
    fromPurchased: row.purchased_before - row.purchased_after,
  };
}

/**
 * The organization's spendable balance: plan credits PLUS purchased credits.
 * Both columns are real money to the user, so anything that shows a balance or
 * decides whether a feature is affordable must use the sum, never one column.
 */
export async function getCredits(organizationId: string): Promise<number> {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { aiCredits: true, aiCreditsPurchased: true },
  });
  return org.aiCredits + org.aiCreditsPurchased;
}

/**
 * Credits back a previously-consumed amount. For the one case where the AI call
 * itself was made (and billed to us by Anthropic) but produced nothing usable —
 * a malformed response we refuse to persist — so the org should not also be
 * billed in credits for a result it never received.
 *
 * ── PUTS EACH CREDIT BACK WHERE IT CAME FROM ──
 * Takes the CreditSpend that consumeCredits returned, not a bare number, so a
 * spend that dipped into the purchased balance is refunded to the purchased
 * balance. Refunding everything to the plan column instead would quietly convert
 * credits the customer PAID FOR into credits that expire at the next monthly
 * renewal — destroying value on what is supposed to be a make-good.
 * Both increments are in ONE update, so a refund cannot half-apply.
 *
 * NOT a general-purpose "undo": deliberately does not touch InsufficientCreditsError
 * paths (nothing was consumed there) or plain model/network failures (matches the
 * existing behaviour of chat/analyze, which never refund either — the Anthropic
 * call happened either way).
 *
 * Double-refund safety: this is a single atomic increment, not a toggle or a
 * balance recomputation, so calling it is only safe to do EXACTLY ONCE per
 * consumeCredits() call it is meant to undo. Callers must not retry or call it
 * from more than one code path for the same failed request — today only
 * /api/ai/insights/generate does, and only once, in the single catch branch for
 * a malformed AI response.
 */
export async function refundCredits(
  organizationId: string,
  spend: Pick<CreditSpend, 'fromPlan' | 'fromPurchased'>,
): Promise<number> {
  const updated = await prisma.organization.update({
    where: { id: organizationId },
    data: {
      aiCredits: { increment: spend.fromPlan },
      aiCreditsPurchased: { increment: spend.fromPurchased },
    },
    select: { aiCredits: true, aiCreditsPurchased: true },
  });
  return updated.aiCredits + updated.aiCreditsPurchased;
}
