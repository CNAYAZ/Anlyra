-- CreateTable
CREATE TABLE "RecurringExpense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "category" TEXT,
    "nextRenewal" DATETIME,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "RecurringExpense_organizationId_active_idx" ON "RecurringExpense"("organizationId", "active");

-- CreateIndex
CREATE INDEX "RecurringExpense_organizationId_category_idx" ON "RecurringExpense"("organizationId", "category");
