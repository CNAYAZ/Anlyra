-- FIX 1 (DEBITO 8): Align Prisma model Insight with actual 13-column DB schema.
-- The DB already has all 13 columns (added by fix_insight_model migration).
-- This migration makes the nullable/optional columns explicit and adds the index.
-- Data is fully preserved via INSERT INTO new_Insight SELECT ... FROM Insight.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Insight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "type" TEXT,
    "priority" TEXT,
    "status" TEXT DEFAULT 'NEW',
    "content" TEXT DEFAULT '',
    "confidence" REAL DEFAULT 0.7,
    "impact" TEXT DEFAULT '',
    "tone" TEXT DEFAULT 'neutral',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Insight_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_Insight" ("confidence", "content", "createdAt", "id", "impact", "organizationId", "priority", "status", "summary", "title", "tone", "type", "updatedAt")
SELECT "confidence", "content", "createdAt", "id", "impact", "organizationId", "priority", "status", "summary", "title", "tone", "type", "updatedAt" FROM "Insight";

DROP TABLE "Insight";
ALTER TABLE "new_Insight" RENAME TO "Insight";

CREATE INDEX IF NOT EXISTS "Insight_organizationId_status_priority_idx" ON "Insight"("organizationId", "status", "priority");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
