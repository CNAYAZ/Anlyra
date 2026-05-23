-- Historical no-op migration (kept for migration history continuity).
-- Originally written when the DB had 7-column Insight (created via db push).
-- NOTE: as of 2026-05-23 this comment is superseded — the DB actually has
--   13 columns after 20260508162711_fix_insight_model was applied in migration order.
-- DEBITO 8 cleanup (2026-05-23):
--   - 20260523_align_insight_schema_with_db: reconciles Prisma model to 13-col
--   - 20260523_drop_insight_b7_zombie: removes Insight_b7 zombie table and model
SELECT 1;
