-- The data needed to issue an Italian electronic invoice to the organization
-- (founder's decision, 2026-09-27: the owner must enter it before the first
-- payment — invoices are issued by hand in Fiscozen, outside the product).
--
-- WHAT IS NOT HERE, AND WHY:
--   • VAT number — Organization."vatNumber" already exists (optional, written
--     only by onboarding, read by nothing). It is reused, now validated.
--   • legal name — Organization."name" is the display name chosen at onboarding,
--     editable by admins too and printed on reports: not necessarily the legal
--     name an invoice needs. Hence "billingLegalName".
--   • country — Organization."country" defaults to 'IT' for everyone and admins
--     can change it: it cannot tell "entered for invoicing" from "never
--     touched". Hence "billingCountry".
--
-- NULLABLE, NO DEFAULT: NULL means "not entered yet", which is true of every
-- organization today. No backfill statement is included or wanted.
--
-- SAFETY: this migration only ADDS eight nullable columns to one table. It
-- drops nothing, rewrites no existing row and changes no existing value. RLS
-- is already enabled on Organization (migration
-- 20260825150000_enable_row_level_security) and covers new columns.

ALTER TABLE "Organization" ADD COLUMN "billingLegalName" TEXT;
ALTER TABLE "Organization" ADD COLUMN "billingAddress" TEXT;
ALTER TABLE "Organization" ADD COLUMN "billingPostalCode" TEXT;
ALTER TABLE "Organization" ADD COLUMN "billingCity" TEXT;
ALTER TABLE "Organization" ADD COLUMN "billingProvince" TEXT;
ALTER TABLE "Organization" ADD COLUMN "billingCountry" TEXT;
ALTER TABLE "Organization" ADD COLUMN "billingSdiCode" TEXT;
ALTER TABLE "Organization" ADD COLUMN "billingPec" TEXT;
