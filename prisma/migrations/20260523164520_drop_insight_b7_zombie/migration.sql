-- FIX 2 (DEBITO 8): Drop Insight_b7 zombie table.
-- Table was empty (0 rows). Model removed from schema.prisma.
-- Was originally a legacy model with FK to Organization_b7 (zombie org).
-- seedInsights() function in session.ts also removed (was deprecated/uncalled).
DROP INDEX IF EXISTS "Insight_b7_organizationId_status_priority_idx";

PRAGMA foreign_keys=off;
DROP TABLE IF EXISTS "Insight_b7";
PRAGMA foreign_keys=on;
