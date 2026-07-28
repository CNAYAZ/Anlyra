-- GDPR right to erasure: record WHEN deletion was requested, without deleting
-- anything now. The purge itself happens 30 days later (src/lib/gdpr/purge.ts).
--
-- SAFETY: this migration only ADDS two nullable columns with no default. It
-- drops nothing, renames nothing and rewrites no existing row: every current row
-- simply gets NULL, which means "no deletion requested". Running it on the live
-- database cannot lose data.
--
-- No index is created on purpose: the purge cron scans these two small tables
-- once a day, and an extra index Prisma does not know about would show up as
-- schema drift on the next `prisma migrate dev`. Add one later if the tables grow.

ALTER TABLE "User" ADD COLUMN "deletionRequestedAt" TIMESTAMP(3);
ALTER TABLE "Organization" ADD COLUMN "deletionRequestedAt" TIMESTAMP(3);
