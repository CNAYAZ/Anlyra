-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "setupCompletedAt" DATETIME;
ALTER TABLE "Organization" ADD COLUMN "teamSize" TEXT;
ALTER TABLE "Organization" ADD COLUMN "trialEndsAt" DATETIME;
ALTER TABLE "Organization" ADD COLUMN "trialStartedAt" DATETIME;
ALTER TABLE "Organization" ADD COLUMN "vatNumber" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "emailVerified" DATETIME;
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "emailVerifyExpiresAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "emailVerifyToken" TEXT;
ALTER TABLE "User" ADD COLUMN "lastLoginAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordResetExpiresAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "passwordResetToken" TEXT;
ALTER TABLE "User" ADD COLUMN "twoFactorBackupCodes" TEXT;
ALTER TABLE "User" ADD COLUMN "twoFactorEnabledAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "twoFactorRemindSentAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "twoFactorSecret" TEXT;

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "acceptedAt" DATETIME,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Invite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CustomerStat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "activeCustomers" INTEGER NOT NULL,
    "newCustomers" INTEGER NOT NULL,
    "churnedCustomers" INTEGER NOT NULL,
    "importBatchId" TEXT,
    CONSTRAINT "CustomerStat_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustomerStat_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CustomerStat" ("activeCustomers", "churnedCustomers", "id", "importBatchId", "newCustomers", "organizationId", "period") SELECT "activeCustomers", "churnedCustomers", "id", "importBatchId", "newCustomers", "organizationId", "period" FROM "CustomerStat";
DROP TABLE "CustomerStat";
ALTER TABLE "new_CustomerStat" RENAME TO "CustomerStat";
CREATE INDEX "CustomerStat_importBatchId_idx" ON "CustomerStat"("importBatchId");
CREATE UNIQUE INDEX "CustomerStat_organizationId_period_key" ON "CustomerStat"("organizationId", "period");
CREATE TABLE "new_FinancialRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "description" TEXT,
    "externalId" TEXT,
    "occurredAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "importBatchId" TEXT,
    CONSTRAINT "FinancialRecord_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_FinancialRecord" ("amount", "createdAt", "currency", "description", "externalId", "id", "importBatchId", "occurredAt", "organizationId", "source", "type") SELECT "amount", "createdAt", "currency", "description", "externalId", "id", "importBatchId", "occurredAt", "organizationId", "source", "type" FROM "FinancialRecord";
DROP TABLE "FinancialRecord";
ALTER TABLE "new_FinancialRecord" RENAME TO "FinancialRecord";
CREATE INDEX "FinancialRecord_organizationId_occurredAt_idx" ON "FinancialRecord"("organizationId", "occurredAt");
CREATE INDEX "FinancialRecord_source_idx" ON "FinancialRecord"("source");
CREATE INDEX "FinancialRecord_importBatchId_idx" ON "FinancialRecord"("importBatchId");
CREATE TABLE "new_ImportBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fileName" TEXT,
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'file',
    "type" TEXT NOT NULL,
    "rowsTotal" INTEGER NOT NULL DEFAULT 0,
    "rowsImported" INTEGER NOT NULL DEFAULT 0,
    "rowsErrors" INTEGER NOT NULL DEFAULT 0,
    "rowsWarnings" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errors" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImportBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User_b4" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ImportBatch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization_b4" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ImportBatch" ("createdAt", "errors", "fileName", "fileSize", "id", "organizationId", "rowsErrors", "rowsImported", "rowsTotal", "rowsWarnings", "source", "status", "type", "userId") SELECT "createdAt", "errors", "fileName", "fileSize", "id", "organizationId", "rowsErrors", "rowsImported", "rowsTotal", "rowsWarnings", "source", "status", "type", "userId" FROM "ImportBatch";
DROP TABLE "ImportBatch";
ALTER TABLE "new_ImportBatch" RENAME TO "ImportBatch";
CREATE INDEX "ImportBatch_userId_idx" ON "ImportBatch"("userId");
CREATE INDEX "ImportBatch_organizationId_idx" ON "ImportBatch"("organizationId");
CREATE INDEX "ImportBatch_createdAt_idx" ON "ImportBatch"("createdAt");
CREATE TABLE "new_KPI_b7" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "unit" TEXT,
    "target" REAL,
    "updatedAt" DATETIME NOT NULL,
    "importBatchId" TEXT,
    CONSTRAINT "KPI_b7_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_KPI_b7" ("id", "importBatchId", "name", "organizationId", "target", "unit", "updatedAt", "value") SELECT "id", "importBatchId", "name", "organizationId", "target", "unit", "updatedAt", "value" FROM "KPI_b7";
DROP TABLE "KPI_b7";
ALTER TABLE "new_KPI_b7" RENAME TO "KPI_b7";
CREATE INDEX "KPI_b7_organizationId_idx" ON "KPI_b7"("organizationId");
CREATE INDEX "KPI_b7_importBatchId_idx" ON "KPI_b7"("importBatchId");
CREATE TABLE "new_Membership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Membership" ("id", "organizationId", "role", "userId") SELECT "id", "organizationId", "role", "userId" FROM "Membership";
DROP TABLE "Membership";
ALTER TABLE "new_Membership" RENAME TO "Membership";
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");
CREATE INDEX "Membership_organizationId_idx" ON "Membership"("organizationId");
CREATE UNIQUE INDEX "Membership_userId_organizationId_key" ON "Membership"("userId", "organizationId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Invite_token_key" ON "Invite"("token");

-- CreateIndex
CREATE INDEX "Invite_email_idx" ON "Invite"("email");

-- CreateIndex
CREATE INDEX "Invite_organizationId_idx" ON "Invite"("organizationId");

-- CreateIndex
CREATE INDEX "Invite_token_idx" ON "Invite"("token");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "User_emailVerifyToken_key" ON "User"("emailVerifyToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_passwordResetToken_key" ON "User"("passwordResetToken");

