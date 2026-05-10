-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Insight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'STRATEGY',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "confidence" REAL NOT NULL DEFAULT 0.7,
    "impact" TEXT NOT NULL DEFAULT '',
    "tone" TEXT NOT NULL DEFAULT 'neutral',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Insight_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Insight" ("createdAt", "id", "impact", "organizationId", "summary", "title", "tone") SELECT "createdAt", "id", "impact", "organizationId", "summary", "title", "tone" FROM "Insight";
DROP TABLE "Insight";
ALTER TABLE "new_Insight" RENAME TO "Insight";
CREATE INDEX "Insight_organizationId_status_priority_idx" ON "Insight"("organizationId", "status", "priority");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
