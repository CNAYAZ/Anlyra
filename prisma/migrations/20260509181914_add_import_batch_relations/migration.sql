-- Migration: add_import_batch_relations
-- Adds importBatchId to FinancialRecord, KPI_b7, CustomerStat
-- Makes ImportBatch.fileName nullable and adds source field
--
-- NOTE: SQLite does not support ALTER COLUMN to change nullability.
-- ImportBatch.fileName change (NOT NULL -> NULL) requires table recreation.
-- This migration is SAFE for fresh databases and databases where existing
-- ImportBatch rows can have fileName set to their existing value (no data loss).

-- Step 1: Recreate ImportBatch with nullable fileName and new source column
PRAGMA foreign_keys=OFF;

CREATE TABLE "ImportBatch_new" (
    "id"             TEXT NOT NULL PRIMARY KEY,
    "userId"         TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fileName"       TEXT,
    "fileSize"       INTEGER NOT NULL DEFAULT 0,
    "source"         TEXT NOT NULL DEFAULT 'file',
    "type"           TEXT NOT NULL,
    "rowsTotal"      INTEGER NOT NULL DEFAULT 0,
    "rowsImported"   INTEGER NOT NULL DEFAULT 0,
    "rowsErrors"     INTEGER NOT NULL DEFAULT 0,
    "rowsWarnings"   INTEGER NOT NULL DEFAULT 0,
    "status"         TEXT NOT NULL DEFAULT 'PENDING',
    "errors"         TEXT,
    "createdAt"      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImportBatch_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User_b4" ("id") ON DELETE CASCADE,
    CONSTRAINT "ImportBatch_organizationId_fkey"
        FOREIGN KEY ("organizationId") REFERENCES "Organization_b4" ("id") ON DELETE CASCADE
);

INSERT INTO "ImportBatch_new" ("id","userId","organizationId","fileName","fileSize","source","type","rowsTotal","rowsImported","rowsErrors","rowsWarnings","status","errors","createdAt")
SELECT "id","userId","organizationId","fileName","fileSize",'file',"type","rowsTotal","rowsImported","rowsErrors","rowsWarnings","status","errors","createdAt"
FROM "ImportBatch";

DROP TABLE "ImportBatch";
ALTER TABLE "ImportBatch_new" RENAME TO "ImportBatch";

CREATE INDEX "ImportBatch_userId_idx" ON "ImportBatch"("userId");
CREATE INDEX "ImportBatch_organizationId_idx" ON "ImportBatch"("organizationId");
CREATE INDEX "ImportBatch_createdAt_idx" ON "ImportBatch"("createdAt");

-- Step 2: Add importBatchId to FinancialRecord
ALTER TABLE "FinancialRecord" ADD COLUMN "importBatchId" TEXT;
CREATE INDEX "FinancialRecord_importBatchId_idx" ON "FinancialRecord"("importBatchId");

-- Step 3: Add importBatchId to KPI_b7
ALTER TABLE "KPI_b7" ADD COLUMN "importBatchId" TEXT;
CREATE INDEX "KPI_b7_importBatchId_idx" ON "KPI_b7"("importBatchId");

-- Step 4: Add importBatchId to CustomerStat
ALTER TABLE "CustomerStat" ADD COLUMN "importBatchId" TEXT;
CREATE INDEX "CustomerStat_importBatchId_idx" ON "CustomerStat"("importBatchId");

PRAGMA foreign_keys=ON;
