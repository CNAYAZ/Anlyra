-- Links receivables and recurring expenses to the import batch that created
-- them, so "annulla lotto" can remove them like it already removes imported
-- movements (founder's decision, 2026-09-29: both can now be imported from a
-- file).
--
-- IDENTICAL to FinancialRecord."importBatchId" (migration
-- 20260702225830_init_postgres): nullable, no default, indexed, foreign key
-- to "ImportBatch" with ON DELETE SET NULL / ON UPDATE CASCADE.
--
-- SAFETY: only ADDS one nullable column (plus its index and foreign key) to
-- each of two tables. Every existing row keeps NULL — rows entered by hand
-- belong to no batch — and no existing value changes. RLS is already enabled
-- on both tables (migration 20260825150000_enable_row_level_security).

ALTER TABLE "Receivable" ADD COLUMN "importBatchId" TEXT;
ALTER TABLE "RecurringExpense" ADD COLUMN "importBatchId" TEXT;

CREATE INDEX "Receivable_importBatchId_idx" ON "Receivable"("importBatchId");
CREATE INDEX "RecurringExpense_importBatchId_idx" ON "RecurringExpense"("importBatchId");

ALTER TABLE "Receivable" ADD CONSTRAINT "Receivable_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RecurringExpense" ADD CONSTRAINT "RecurringExpense_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
