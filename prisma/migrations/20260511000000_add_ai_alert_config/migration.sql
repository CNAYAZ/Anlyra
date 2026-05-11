-- CreateTable: AiAlertConfig
-- These tables exist in schema.prisma but were missing from migrations (added via db push).
-- Run: npx prisma migrate deploy

CREATE TABLE IF NOT EXISTS "AiAlertConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "threshold" REAL NOT NULL,
    "comparator" TEXT NOT NULL DEFAULT 'gt',
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "AiAlertConfig_organizationId_metric_key"
    ON "AiAlertConfig"("organizationId", "metric");

-- CreateTable: AiAlert
CREATE TABLE IF NOT EXISTS "AiAlert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "metric" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "thresholdValue" REAL,
    "currentValue" REAL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "AiAlert_organizationId_createdAt_idx"
    ON "AiAlert"("organizationId", "createdAt");

CREATE INDEX IF NOT EXISTS "AiAlert_organizationId_read_idx"
    ON "AiAlert"("organizationId", "read");
