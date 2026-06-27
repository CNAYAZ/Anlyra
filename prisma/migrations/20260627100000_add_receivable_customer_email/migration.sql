-- Add optional customerEmail to Receivable.
-- Enables the "send reminder via mailto" action. Additive and nullable:
-- existing rows are unaffected (NULL = no email on file).
ALTER TABLE "Receivable" ADD COLUMN "customerEmail" TEXT;
