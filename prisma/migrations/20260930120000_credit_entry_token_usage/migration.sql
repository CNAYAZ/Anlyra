-- Records, on the 'ai_call' row of the credit ledger, the tokens the model
-- actually used and on which model (founder's decision, 2026-09-30: an AI
-- operation now costs what it used, so the ledger has to say what that was).
--
-- SAFETY: only ADDS five nullable columns, no default, to "CreditEntry".
-- Every existing row keeps NULL (a movement recorded before this change, or a
-- movement that is not an AI call) and no existing value changes. RLS is
-- already enabled on this table (migration 20260825150000_enable_row_level_security).

ALTER TABLE "CreditEntry" ADD COLUMN "inputTokens" INTEGER;
ALTER TABLE "CreditEntry" ADD COLUMN "outputTokens" INTEGER;
ALTER TABLE "CreditEntry" ADD COLUMN "cacheReadTokens" INTEGER;
ALTER TABLE "CreditEntry" ADD COLUMN "cacheWriteTokens" INTEGER;
ALTER TABLE "CreditEntry" ADD COLUMN "model" TEXT;
