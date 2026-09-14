import { prisma } from './prisma';

export class InsufficientCreditsError extends Error {
  constructor() {
    super('INSUFFICIENT_CREDITS');
    this.name = 'InsufficientCreditsError';
  }
}

/**
 * Why a CreditEntry row exists. One string per KIND of balance movement.
 *
 * The first four are the causali the schema has always declared. The last two
 * name movements that existed in the code but had no causale of their own —
 * rather than filing them under a label that would be false (a signup grant is
 * not a "monthly_grant"; an operator correction is not a "purchase"), they get
 * their own. `CreditEntry.reason` is a plain String column, so this costs no
 * migration.
 */
export type CreditReason =
  | 'monthly_grant'
  | 'purchase'
  | 'ai_call'
  | 'refund'
  | 'signup_grant'
  | 'admin_adjustment';

/**
 * Records ONE ledger row for a balance movement that has ALREADY been written.
 *
 * ── BEST EFFORT, ON PURPOSE ──
 * Never throws. The caller has, by the time this runs, already moved real
 * credits; letting a failed ledger INSERT propagate would turn a bookkeeping
 * problem into a customer-facing one — at best an error on a call that actually
 * succeeded, at worst (inside a transaction) a credit movement rolled back
 * because we could not write a note about it. A ledger with a hole in it is
 * recoverable; a credit that vanished, or one charged for a reply the customer
 * never got, is not. The failure is logged loudly so the hole can be found.
 *
 * ── CALL IT AFTER THE MOVEMENT, NEVER BEFORE ──
 * A row written first would be a claim about something that may not happen.
 *
 * ── NOT FOR MOVEMENTS THAT RETRY THEMSELVES ──
 * Where the caller already runs inside a transaction it can safely repeat — the
 * monthly renewal, which leaves creditsRenewedAt untouched on failure and is
 * picked up by the next daily run — the ledger row belongs INSIDE that
 * transaction instead, so the balance and its explanation can never disagree.
 * See src/lib/cron/credit-renewal.ts.
 */
export async function recordCreditEntry(
  organizationId: string,
  delta: number,
  reason: CreditReason,
): Promise<void> {
  // A movement of zero is not a movement. Skipped so the ledger stays readable
  // (an admin edit that changes nothing, a refund of nothing).
  if (delta === 0) return;
  try {
    await prisma.creditEntry.create({
      data: { organizationId, delta, reason },
    });
  } catch (err) {
    console.error(
      `[credits] ledger write FAILED for org ${organizationId} (delta ${delta}, reason ${reason}) — the balance moved, the trail did not:`,
      err,
    );
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
  // way the old code did — and, because nothing moved, neither writes a ledger
  // row: the ledger records movements, not attempts.
  if (!row) {
    throw new InsufficientCreditsError();
  }

  const spend: CreditSpend = {
    remaining: row.plan_after + row.purchased_after,
    fromPlan: row.plan_before - row.plan_after,
    fromPurchased: row.purchased_before - row.purchased_after,
  };

  // ── THE LEDGER ROW IS WRITTEN HERE, AND DELIBERATELY NOT ABOVE ──
  // The statement above is the ONLY thing preventing double-spending, and it
  // works precisely because it is one statement (see the header). Postgres would
  // happily let the INSERT ride along as a data-modifying CTE inside it, and
  // that was the tempting option — but it welds the two together in the wrong
  // direction: a ledger INSERT that failed would roll back the whole statement,
  // so a bookkeeping fault would start refusing paid-for AI calls. Writing the
  // row afterwards keeps the atomic statement byte-for-byte what it was, and
  // recordCreditEntry never throws, so nothing about this call's outcome depends
  // on the ledger succeeding.
  // The cost of that choice, stated plainly: a process that dies between the two
  // leaves a spend with no row. The balance is still right — it is the trail
  // that has the hole, which is the direction this is meant to fail in.
  // The delta is the movement, not the request: fromPlan + fromPurchased, which
  // equals `amount` on success and would be the only honest number if it ever
  // did not.
  await recordCreditEntry(organizationId, -(spend.fromPlan + spend.fromPurchased), 'ai_call');

  return spend;
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
 * from more than one code path for the same failed request. Two callers do
 * today, each exactly once, from a single catch branch: /api/ai/insights/generate
 * (a malformed AI response) and /api/ai/chat (a thread past the model's context
 * window). Both write one ledger row per refund, so a double refund would be
 * visible in the trail as two 'refund' rows for one 'ai_call'.
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

  // After the increment, for the same reason as in consumeCredits: a refund that
  // failed because of its own ledger row would leave the customer charged for
  // something we already decided they should not pay for.
  await recordCreditEntry(organizationId, spend.fromPlan + spend.fromPurchased, 'refund');

  return updated.aiCredits + updated.aiCreditsPurchased;
}
