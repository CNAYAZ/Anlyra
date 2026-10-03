-- The register of free trials: one row per VAT number that has had (or
-- attempted) a trial, with the card fingerprint and the IP when known.
-- Founder's decisions (2026-09-30): one trial per card, per VAT number and per
-- company; VAT number and card fingerprint kept 24 months, IP 12 months, from
-- the activation of the trial or the attempt (claimedAt); the IP is only a
-- signal for the founder, never an automatic refusal; a person can review a
-- row and grant the trial anyway (art. 22 GDPR).
--
-- "organizationId" is plain text with NO foreign key on purpose: the register
-- must outlive the deletion of the company it came from.
--
-- SAFETY: creates one new table and its indexes. Nothing existing is touched.
-- RLS is enabled here, in the same migration, like every other table.

CREATE TABLE "TrialClaim" (
    "id" TEXT NOT NULL,
    "vatNumber" TEXT NOT NULL,
    "cardFingerprint" TEXT,
    "organizationId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT,
    "ip" TEXT,
    "claimedAt" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "reviewGrantedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrialClaim_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TrialClaim_vatNumber_key" ON "TrialClaim"("vatNumber");
CREATE INDEX "TrialClaim_cardFingerprint_idx" ON "TrialClaim"("cardFingerprint");
CREATE INDEX "TrialClaim_ip_claimedAt_idx" ON "TrialClaim"("ip", "claimedAt");
CREATE INDEX "TrialClaim_claimedAt_idx" ON "TrialClaim"("claimedAt");

ALTER TABLE public."TrialClaim" ENABLE ROW LEVEL SECURITY;
