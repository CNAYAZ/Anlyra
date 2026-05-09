-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'it',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'STARTER',
    "aiCredits" INTEGER NOT NULL DEFAULT 100,
    "aiCreditsBalance" INTEGER NOT NULL DEFAULT 100,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "industry" TEXT NOT NULL DEFAULT 'Generale',
    "employees" INTEGER NOT NULL DEFAULT 1,
    "country" TEXT NOT NULL DEFAULT 'IT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'owner',
    CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "kind" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "amount" REAL NOT NULL,
    "description" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    CONSTRAINT "Transaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CashflowEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "direction" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "description" TEXT,
    CONSTRAINT "CashflowEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BudgetEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "planned" REAL NOT NULL,
    "actual" REAL NOT NULL,
    CONSTRAINT "BudgetEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomerStat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "activeCustomers" INTEGER NOT NULL,
    "newCustomers" INTEGER NOT NULL,
    "churnedCustomers" INTEGER NOT NULL,
    CONSTRAINT "CustomerStat_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "customer" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "mrr" REAL NOT NULL,
    "startedAt" DATETIME NOT NULL,
    "cancelledAt" DATETIME,
    CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Insight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "tone" TEXT NOT NULL DEFAULT 'neutral',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Insight_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User_b4" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Organization_b4" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User_b4" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization_b4" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
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

-- CreateTable
CREATE TABLE "Revenue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "importId" TEXT,
    "date" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "category" TEXT NOT NULL,
    "description" TEXT,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Revenue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User_b4" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Revenue_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization_b4" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Revenue_importId_fkey" FOREIGN KEY ("importId") REFERENCES "ImportBatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Cost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "importId" TEXT,
    "date" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "category" TEXT NOT NULL,
    "description" TEXT,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Cost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User_b4" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Cost_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization_b4" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Cost_importId_fkey" FOREIGN KEY ("importId") REFERENCES "ImportBatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Kpi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "importId" TEXT,
    "name" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "target" REAL,
    "unit" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Kpi_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User_b4" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Kpi_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization_b4" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Kpi_importId_fkey" FOREIGN KEY ("importId") REFERENCES "ImportBatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Competitor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "importId" TEXT,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "description" TEXT,
    "estimatedRevenue" REAL,
    "employees" INTEGER,
    "marketShare" REAL,
    "strengths" TEXT NOT NULL,
    "weaknesses" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Competitor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User_b4" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Competitor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization_b4" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Competitor_importId_fkey" FOREIGN KEY ("importId") REFERENCES "ImportBatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User_b5" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "emailVerified" DATETIME,
    "plan" TEXT NOT NULL DEFAULT 'FREEMIUM',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Organization_b5" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "industry" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Organization_b5_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User_b5" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarketProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "marketSharePct" REAL NOT NULL,
    "tam" REAL NOT NULL,
    "sam" REAL NOT NULL,
    "som" REAL NOT NULL,
    "growthPct" REAL NOT NULL,
    "scoreRevenue" REAL NOT NULL DEFAULT 70,
    "scoreTeam" REAL NOT NULL DEFAULT 70,
    "scoreShare" REAL NOT NULL DEFAULT 70,
    "scorePricing" REAL NOT NULL DEFAULT 70,
    "scoreProduct" REAL NOT NULL DEFAULT 70,
    "scoreBrand" REAL NOT NULL DEFAULT 70,
    "pricePosition" REAL NOT NULL DEFAULT 50,
    "qualityScore" REAL NOT NULL DEFAULT 75,
    "overview" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MarketProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization_b5" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Competitor_b5" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "revenue" REAL NOT NULL,
    "employees" INTEGER NOT NULL,
    "marketSharePct" REAL NOT NULL,
    "strengths" TEXT NOT NULL DEFAULT '',
    "weaknesses" TEXT NOT NULL DEFAULT '',
    "scoreRevenue" REAL NOT NULL DEFAULT 50,
    "scoreTeam" REAL NOT NULL DEFAULT 50,
    "scoreShare" REAL NOT NULL DEFAULT 50,
    "scorePricing" REAL NOT NULL DEFAULT 50,
    "scoreProduct" REAL NOT NULL DEFAULT 50,
    "scoreBrand" REAL NOT NULL DEFAULT 50,
    "pricePosition" REAL NOT NULL DEFAULT 50,
    "qualityScore" REAL NOT NULL DEFAULT 50,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Competitor_b5_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization_b5" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarketTrend" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "marketSize" REAL NOT NULL,
    "growthPct" REAL NOT NULL,
    "tam" REAL NOT NULL,
    "sam" REAL NOT NULL,
    "som" REAL NOT NULL,
    CONSTRAINT "MarketTrend_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization_b5" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SwotItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SwotItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization_b5" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User_b7" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'IT',
    "organizationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_b7_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization_b7" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Organization_b7" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "employees" INTEGER NOT NULL DEFAULT 1,
    "country" TEXT NOT NULL DEFAULT 'IT',
    "plan" TEXT NOT NULL DEFAULT 'STARTER',
    "aiCredits" INTEGER NOT NULL DEFAULT 100,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FinancialData" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "month" DATETIME NOT NULL,
    "revenue" REAL NOT NULL,
    "costs" REAL NOT NULL,
    "margin" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinancialData_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization_b7" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KPI_b7" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "unit" TEXT,
    "target" REAL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Competitor_b7" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "marketShare" REAL,
    "notes" TEXT
);

-- CreateTable
CREATE TABLE "AIConversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AIMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tokensIn" INTEGER,
    "tokensOut" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AIMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AIConversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Insight_b7" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "confidence" REAL NOT NULL DEFAULT 0.7,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Insight_b7_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization_b7" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Organization_b12" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'FREEMIUM',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
    "apiKey" TEXT,
    "config" TEXT,
    "frequency" TEXT NOT NULL DEFAULT 'H24',
    "lastSyncAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Integration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization_b12" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "integrationId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "recordsCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    CONSTRAINT "SyncLog_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FinancialRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "description" TEXT,
    "externalId" TEXT,
    "occurredAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "_OrgMembers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_OrgMembers_A_fkey" FOREIGN KEY ("A") REFERENCES "Organization_b5" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_OrgMembers_B_fkey" FOREIGN KEY ("B") REFERENCES "User_b5" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_organizationId_key" ON "Membership"("userId", "organizationId");

-- CreateIndex
CREATE INDEX "Transaction_organizationId_date_idx" ON "Transaction"("organizationId", "date");

-- CreateIndex
CREATE INDEX "Transaction_organizationId_kind_idx" ON "Transaction"("organizationId", "kind");

-- CreateIndex
CREATE INDEX "Transaction_organizationId_category_idx" ON "Transaction"("organizationId", "category");

-- CreateIndex
CREATE INDEX "CashflowEntry_organizationId_date_idx" ON "CashflowEntry"("organizationId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetEntry_organizationId_period_category_key" ON "BudgetEntry"("organizationId", "period", "category");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerStat_organizationId_period_key" ON "CustomerStat"("organizationId", "period");

-- CreateIndex
CREATE INDEX "Subscription_organizationId_idx" ON "Subscription"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "User_b4_email_key" ON "User_b4"("email");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_userId_organizationId_key" ON "OrganizationMember"("userId", "organizationId");

-- CreateIndex
CREATE INDEX "ImportBatch_userId_idx" ON "ImportBatch"("userId");

-- CreateIndex
CREATE INDEX "ImportBatch_organizationId_idx" ON "ImportBatch"("organizationId");

-- CreateIndex
CREATE INDEX "ImportBatch_createdAt_idx" ON "ImportBatch"("createdAt");

-- CreateIndex
CREATE INDEX "Revenue_organizationId_date_idx" ON "Revenue"("organizationId", "date");

-- CreateIndex
CREATE INDEX "Revenue_importId_idx" ON "Revenue"("importId");

-- CreateIndex
CREATE INDEX "Cost_organizationId_date_idx" ON "Cost"("organizationId", "date");

-- CreateIndex
CREATE INDEX "Cost_importId_idx" ON "Cost"("importId");

-- CreateIndex
CREATE INDEX "Kpi_organizationId_name_idx" ON "Kpi"("organizationId", "name");

-- CreateIndex
CREATE INDEX "Kpi_importId_idx" ON "Kpi"("importId");

-- CreateIndex
CREATE INDEX "Competitor_organizationId_idx" ON "Competitor"("organizationId");

-- CreateIndex
CREATE INDEX "Competitor_importId_idx" ON "Competitor"("importId");

-- CreateIndex
CREATE UNIQUE INDEX "User_b5_email_key" ON "User_b5"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_b5_slug_key" ON "Organization_b5"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "MarketProfile_organizationId_key" ON "MarketProfile"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketTrend_organizationId_period_key" ON "MarketTrend"("organizationId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "User_b7_email_key" ON "User_b7"("email");

-- CreateIndex
CREATE INDEX "FinancialData_organizationId_month_idx" ON "FinancialData"("organizationId", "month");

-- CreateIndex
CREATE INDEX "KPI_b7_organizationId_idx" ON "KPI_b7"("organizationId");

-- CreateIndex
CREATE INDEX "Competitor_b7_organizationId_idx" ON "Competitor_b7"("organizationId");

-- CreateIndex
CREATE INDEX "AIConversation_organizationId_updatedAt_idx" ON "AIConversation"("organizationId", "updatedAt");

-- CreateIndex
CREATE INDEX "AIConversation_userId_idx" ON "AIConversation"("userId");

-- CreateIndex
CREATE INDEX "AIMessage_conversationId_createdAt_idx" ON "AIMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "Insight_b7_organizationId_status_priority_idx" ON "Insight_b7"("organizationId", "status", "priority");

-- CreateIndex
CREATE INDEX "Integration_provider_idx" ON "Integration"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "Integration_organizationId_provider_key" ON "Integration"("organizationId", "provider");

-- CreateIndex
CREATE INDEX "SyncLog_integrationId_idx" ON "SyncLog"("integrationId");

-- CreateIndex
CREATE INDEX "SyncLog_startedAt_idx" ON "SyncLog"("startedAt");

-- CreateIndex
CREATE INDEX "FinancialRecord_organizationId_occurredAt_idx" ON "FinancialRecord"("organizationId", "occurredAt");

-- CreateIndex
CREATE INDEX "FinancialRecord_source_idx" ON "FinancialRecord"("source");

-- CreateIndex
CREATE UNIQUE INDEX "_OrgMembers_AB_unique" ON "_OrgMembers"("A", "B");

-- CreateIndex
CREATE INDEX "_OrgMembers_B_index" ON "_OrgMembers"("B");
