-- Audit trail of sensitive actions.
--
-- Records WHO did WHAT, WHEN, on WHICH organization, and whether it succeeded.
-- Scope decided by the founder: destructive/management actions, logins, and data
-- imports — deliberately NOT AI generations (frequent, and already traced by the
-- credit ledger).
--
-- PRIVACY: this table records THAT an action happened, never its payload. No
-- passwords, no tokens, no imported file contents, no financial amounts. The
-- "metadata" column is a short JSON string for non-sensitive context only.
--
-- NO FOREIGN KEYS, on purpose: an audit row must outlive the user or the
-- organization it refers to. A deletion is precisely the event the trail exists
-- to record, so a cascade would erase the evidence along with the subject.
--
-- SAFETY: this migration only CREATES a new table. It touches no existing table,
-- drops nothing and rewrites no row. Running it on the live database cannot lose
-- data.

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "organizationId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "outcome" TEXT NOT NULL DEFAULT 'success',
    "ip" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
