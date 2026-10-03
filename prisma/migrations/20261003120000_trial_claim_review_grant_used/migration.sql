-- A review that grants a trial anyway (TrialClaim.reviewGrantedAt) is good for
-- ONE trial (founder's decision, 2026-10-03). This records when that trial
-- started: from then on the row counts as a trial used again.
--
-- SAFETY: one nullable column, no default, on a table not yet in production.
-- Nothing existing changes. RLS is already enabled on "TrialClaim"
-- (migration 20260930140000_trial_claim_registry).

ALTER TABLE "TrialClaim" ADD COLUMN "reviewGrantUsedAt" TIMESTAMP(3);
