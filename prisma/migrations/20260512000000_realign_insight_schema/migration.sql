-- No-op migration: confirms schema.prisma Insight model matches the actual DB.
-- The DB was created via `prisma db push` with the original 7-column Insight schema.
-- Migration 20260508162711_fix_insight_model was never applied to the DB.
-- schema.prisma Insight model remains at 7 columns (id, organizationId, title, summary,
-- impact, tone, createdAt) which matches the actual SQLite table structure.
-- type/priority/status/content/confidence are derived by the API layer from tone/impact.
SELECT 1;
