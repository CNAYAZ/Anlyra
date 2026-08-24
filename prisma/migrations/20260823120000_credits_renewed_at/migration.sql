-- Tracks when the monthly AI-credit reset last ran for a subscription.
--
-- WHY A NEW COLUMN: "currentPeriodEnd" says when the billing period ends, but it
-- cannot answer "have I already granted credits for this period?". The renewal
-- job runs daily (bolted onto /api/cron/trial-check, because Vercel Hobby allows
-- only 2 crons and both slots are taken), so without a marker it would reset the
-- balance on every single run instead of once per period.
--
-- NULLABLE, NO DEFAULT — deliberately: NULL means "never renewed", which the job
-- treats as due. Every subscription that exists today therefore gets its first
-- reset on the next cron run, instead of being frozen out because a backfilled
-- date made it look already-granted. No backfill statement is needed or wanted.
--
-- SAFETY: this migration only ADDS one nullable column to one table. It drops
-- nothing, rewrites no existing row, and changes no existing value. Running it on
-- the live database cannot lose data and cannot alter any organization's current
-- credit balance.

ALTER TABLE "BillingSubscription" ADD COLUMN "creditsRenewedAt" TIMESTAMP(3);
