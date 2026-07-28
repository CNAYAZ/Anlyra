-- Real PDF generation + server-validated share links for reports.
--
-- SAFETY: additive only. Four NULLABLE columns with no default; nothing is
-- dropped, renamed or rewritten. Existing Report_b8 rows simply get NULL, which
-- means "no stored config" (a default is derived at render time) and "not
-- shared". Running this on the live database cannot lose data.

ALTER TABLE "Report_b8" ADD COLUMN "config" TEXT;
ALTER TABLE "Report_b8" ADD COLUMN "shareToken" TEXT;
ALTER TABLE "Report_b8" ADD COLUMN "shareCreatedAt" TIMESTAMP(3);
ALTER TABLE "Report_b8" ADD COLUMN "shareExpiresAt" TIMESTAMP(3);

-- The public share route looks a report up BY TOKEN, so the lookup must be
-- indexed and a token must never be ambiguous. A unique index over a nullable
-- column still allows many un-shared rows (NULLs are not equal in Postgres).
CREATE UNIQUE INDEX "Report_b8_shareToken_key" ON "Report_b8"("shareToken");
