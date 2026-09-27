-- Records a request to delete an organization that is WAITING for the founder's
-- confirmation, and who made it.
--
-- WHY NEW COLUMNS: Organization."deletionRequestedAt" already means "confirmed,
-- the 30-day countdown is running" — the purge cron deletes every organization
-- whose value is older than 30 days (src/lib/gdpr/purge.ts). A request that has
-- NOT been confirmed yet cannot live there, or it would be deleted without the
-- founder ever seeing it. The audit log is not a safe place either: auditLog()
-- swallows its own write errors by design (src/lib/audit/log.ts), so a request
-- written only there could be lost without anyone knowing.
--
-- "deletionApprovalRequestedById" is a plain column with NO foreign key, like
-- Organization."createdByUserId": a foreign key would either block the purge of
-- the requester's own account (RESTRICT) or silently rewrite this row when it
-- runs (SET NULL). The panel shows "account no longer exists" when it points
-- at nobody.
--
-- NULLABLE, NO DEFAULT: NULL means "no request waiting", which is true of every
-- organization today. No backfill statement is included or wanted.
--
-- SAFETY: this migration only ADDS two nullable columns to one table. It drops
-- nothing, rewrites no existing row and changes no existing value. Organization
-- already has Row Level Security enabled (migration
-- 20260825150000_enable_row_level_security); RLS is per table, so new columns
-- are covered without any further statement.

ALTER TABLE "Organization" ADD COLUMN "deletionApprovalRequestedAt" TIMESTAMP(3);
ALTER TABLE "Organization" ADD COLUMN "deletionApprovalRequestedById" TEXT;
