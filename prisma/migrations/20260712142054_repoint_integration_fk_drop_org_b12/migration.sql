-- Repoint Integration FK from the empty duplicate Organization_b12 to the real
-- Organization, then drop the empty Organization_b12 table.
-- Safe: Organization_b12 has 0 rows and Integration has 0 rows (verified).

-- DropForeignKey
ALTER TABLE "Integration" DROP CONSTRAINT "Integration_organizationId_fkey";

-- DropTable
DROP TABLE "Organization_b12";

-- AddForeignKey
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
