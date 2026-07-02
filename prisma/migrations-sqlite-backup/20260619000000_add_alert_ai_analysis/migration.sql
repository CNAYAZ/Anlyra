-- Add nullable aiAnalysis column to Alert.
-- Stores the on-demand AI analysis as JSON { explanation, actions[] }.
-- Additive and nullable: existing rows are unaffected (NULL = not yet analyzed).
ALTER TABLE "Alert" ADD COLUMN "aiAnalysis" TEXT;
