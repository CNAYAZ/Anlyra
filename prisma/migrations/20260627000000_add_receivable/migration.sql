-- CreateTable
CREATE TABLE "Receivable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "invoiceNumber" TEXT,
    "issuedDate" DATETIME,
    "dueDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Receivable_organizationId_dueDate_idx" ON "Receivable"("organizationId", "dueDate");

-- CreateIndex
CREATE INDEX "Receivable_organizationId_status_idx" ON "Receivable"("organizationId", "status");
