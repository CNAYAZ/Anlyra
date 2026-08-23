-- Stripe webhook idempotency ledger.
--
-- WHY: the webhook verifies the signature but processes every delivery. Stripe
-- RETRIES an event when our response is slow, non-2xx, or the connection drops,
-- so the same event.id can arrive several times. Today a retry of
-- checkout.session.completed for a credit purchase inserts a SECOND CreditEntry
-- ledger row (addCreditEntry does a plain create, not an upsert), and re-runs
-- plan transitions and the confirmation email.
--
-- The UNIQUE constraint on "eventId" is the whole point: when two deliveries of
-- the same event land at the same instant, the DATABASE rejects the second
-- INSERT (Prisma P2002). A read-then-write check in application code would let
-- both concurrent requests through.
--
-- SAFETY: this migration only CREATES a new table. It touches no existing table,
-- drops nothing and rewrites no row. Running it on the live database cannot lose
-- data.

CREATE TABLE "StripeWebhookEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StripeWebhookEvent_eventId_key" ON "StripeWebhookEvent"("eventId");

-- Supports the retention sweep in the existing gdpr-purge cron.
CREATE INDEX "StripeWebhookEvent_createdAt_idx" ON "StripeWebhookEvent"("createdAt");
