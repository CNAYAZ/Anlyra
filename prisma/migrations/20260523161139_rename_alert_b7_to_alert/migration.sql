-- Rename model Alert_b7 → Alert
-- Alert_b7 was created via prisma db push (no prior migration).
-- This migration establishes the clean table name "Alert".
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "Alert_organizationId_source_key" ON "Alert"("organizationId", "source");
CREATE INDEX "Alert_organizationId_status_idx" ON "Alert"("organizationId", "status");
CREATE INDEX "Alert_organizationId_severity_idx" ON "Alert"("organizationId", "severity");
