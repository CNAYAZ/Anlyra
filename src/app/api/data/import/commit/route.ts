import { NextRequest } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { ok, fail, failFromError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/session';
import { requireWritableOrg } from '@/lib/auth/require-writable';
import { requireEditorRole } from '@/lib/auth/require-role';
import { requireActiveAccess } from '@/lib/billing/server-gate';
import { getImportTarget, type ImportTargetKey } from '@/lib/import-targets';
import { validateRows, buildFinancialDescription, type RowError } from '@/lib/import/validate';
import { ensureImportBatchFkRows } from '@/lib/import/batch-fk';
import { auditLog } from '@/lib/audit/log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  batchId: z.string().optional(),
  targetKey: z.string(),
  mapping: z.record(z.string(), z.union([z.string(), z.null()])),
  rows: z.array(z.record(z.string(), z.unknown())),
  fileName: z.string().default('upload'),
  fileSize: z.number().int().nonnegative().default(0),
});

/**
 * The batch's final status, from facts rather than ratios.
 *
 * 'FAILED' means exactly one thing: NOTHING was written. It used to ALSO mean
 * "more than 10% of the rows had errors", while the valid rows had already been
 * inserted — so an import that saved 35 rows out of 50 announced "Importazione
 * fallita", which reads as "nothing happened", and the natural reaction to that
 * is to upload the same file again. The 10% threshold described nothing the
 * customer could act on either: 9% errors and 91% errors produced two opposite
 * messages about the same kind of outcome, a partial import.
 *
 * The empty-rows case (every row skipped because it looked already present, see
 * the duplicates route) stays COMPLETED: there was nothing to write, and
 * nothing failed.
 *
 * One definition, used by both write paths below, so the two cannot drift.
 */
function decideStatus(imported: number, submitted: number, issues: number): string {
  if (imported === 0 && submitted > 0) return 'FAILED';
  return issues === 0 ? 'COMPLETED' : 'COMPLETED_WITH_ERRORS';
}

/**
 * Takes the client instead of using the global one, so the same function can
 * run inside a transaction together with the batch's status update. That is
 * the only reason its first argument changed.
 */
async function insertFinancialRecords(
  db: Prisma.TransactionClient,
  organizationId: string,
  importBatchId: string,
  rows: Record<string, unknown>[],
) {
  if (rows.length === 0) return 0;
  const data = rows.map((r) => ({
    organizationId,
    importBatchId,
    amount: r.amount as number,
    type: r.type as string,
    occurredAt: new Date(r.occurredAt as string),
    description: buildFinancialDescription(r),
    source: (r.source as string | undefined) ?? 'import',
  }));
  await db.financialRecord.createMany({ data });
  return data.length;
}

async function insertKpis(
  organizationId: string,
  importBatchId: string,
  rows: Record<string, unknown>[],
) {
  let count = 0;
  for (const r of rows) {
    await prisma.kPI.create({
      data: {
        organizationId,
        importBatchId,
        name: r.name as string,
        value: r.value as number,
        unit: (r.unit as string | undefined) ?? null,
        target: (r.target as number | undefined) ?? null,
      },
    });
    count++;
  }
  return count;
}

async function insertCompetitors(
  organizationId: string,
  userId: string,
  importBatchId: string,
  rows: Record<string, unknown>[],
) {
  let count = 0;
  for (const r of rows) {
    await prisma.competitor.create({
      data: {
        userId,
        organizationId,
        importId: importBatchId,
        name: r.name as string,
        website: (r.website as string | undefined) ?? null,
        description: (r.description as string | undefined) ?? null,
        estimatedRevenue: (r.estimatedRevenue as number | undefined) ?? null,
        employees: (r.employees as number | undefined) ?? null,
        marketShare: (r.marketShare as number | undefined) ?? null,
        strengths: '',
        weaknesses: '',
      },
    });
    count++;
  }
  return count;
}

async function insertCustomerStats(
  organizationId: string,
  importBatchId: string,
  rows: Record<string, unknown>[],
) {
  let count = 0;
  for (const r of rows) {
    await prisma.customerStat.upsert({
      where: {
        organizationId_period: {
          organizationId,
          period: r.period as string,
        },
      },
      update: {
        importBatchId,
        activeCustomers: r.activeCustomers as number,
        newCustomers: r.newCustomers as number,
        churnedCustomers: r.churnedCustomers as number,
      },
      create: {
        organizationId,
        importBatchId,
        period: r.period as string,
        activeCustomers: r.activeCustomers as number,
        newCustomers: r.newCustomers as number,
        churnedCustomers: r.churnedCustomers as number,
      },
    });
    count++;
  }
  return count;
}

export async function POST(req: NextRequest) {
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) return fail('Unauthorized', 401);
    // Demo organization: read-only. See requireWritableOrg.
    const readOnly = requireWritableOrg(authCtx.organizationId);
    if (readOnly) return readOnly;
    // Viewer: read-only role — see requireEditorRole.
    const viewerOnly = requireEditorRole(authCtx);
    if (viewerOnly) return viewerOnly;
    const { userId, organizationId } = authCtx;

    // Expired trial (or past_due) is read-only: block committing an import.
    const access = await requireActiveAccess(organizationId);
    if (!access.allowed) return fail('TRIAL_EXPIRED', 402);
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'INVALID_BODY', 400);

    const { batchId, targetKey, mapping, rows, fileName, fileSize } = parsed.data;
    const target = getImportTarget(targetKey);
    if (!target) return fail('INVALID_TARGET', 400);

    // Resolve the PENDING batch created at preview time, or create one for
    // direct API callers that skipped the preview step.
    let batch;
    if (batchId) {
      batch = await prisma.importBatch.findFirst({
        where: { id: batchId, organizationId },
      });
      if (!batch) return fail('BATCH_NOT_FOUND', 404);
      if (batch.status !== 'PENDING') return fail('BATCH_NOT_PENDING', 409);
      batch = await prisma.importBatch.update({
        where: { id: batch.id },
        data: { status: 'PROCESSING', rowsTotal: rows.length },
      });
    } else {
      await ensureImportBatchFkRows(userId, organizationId);
      batch = await prisma.importBatch.create({
        data: {
          userId,
          organizationId,
          fileName,
          fileSize,
          source: 'file',
          type: targetKey,
          rowsTotal: rows.length,
          status: 'PROCESSING',
        },
      });
    }

    const { validRows, errors } = validateRows(target, mapping, rows);
    const allErrors: RowError[] = [...errors];

    let imported = 0;
    // The financial path writes its own final status INSIDE its transaction, so
    // the shared update below must not run a second time for it.
    let statusAlreadyWritten = false;
    try {
      switch (targetKey as ImportTargetKey) {
        case 'financial_records':
          // ── WRITE AND STATUS IN THE SAME TRANSACTION ──
          // They used to be two separate statements: the rows went in, and only
          // then the batch was moved off 'PROCESSING'. Anything that killed the
          // request in between — and the measurements below say that is not
          // hypothetical — left the rows written and the batch stuck on
          // 'PROCESSING' forever, with the customer never seeing a result.
          //
          // MEASURED, on a throwaway Postgres, for the single createMany this
          // path uses: 1.000 rows 100 ms, 10.000 rows 1,6 s, 100.000 rows
          // (MAX_EXCEL_ROWS, the parser's ceiling) 12,7 s. The transaction adds
          // no work of its own — the createMany costs the same inside or out —
          // so nothing here got slower. What changed is the failure: if the
          // platform kills the function mid-flight the connection drops, an
          // uncommitted transaction is rolled back by Postgres, and the
          // customer is left with clean data to retry instead of half a file.
          //
          // The explicit timeout exists because Prisma aborts an interactive
          // transaction at its own default otherwise — measured at 5.005 ms, so
          // 5 seconds — which a large file would cross (it did: 10.000 rows in
          // a per-row loop aborted with P2028 at exactly that mark). 30 s is
          // set well above the 12,7 s worst case so that Prisma is never what
          // fails first; the platform's own function limit is the real ceiling
          // and it is documented in the report.
          imported = await prisma.$transaction(
            async (tx) => {
              const written = await insertFinancialRecords(tx, organizationId, batch.id, validRows);
              await tx.importBatch.update({
                where: { id: batch.id },
                data: {
                  rowsImported: written,
                  rowsErrors: allErrors.length,
                  status: decideStatus(written, rows.length, allErrors.length),
                  errors: JSON.stringify(allErrors.slice(0, 200)),
                },
              });
              return written;
            },
            { timeout: 30_000, maxWait: 10_000 },
          );
          statusAlreadyWritten = true;
          break;
        case 'kpis':
          imported = await insertKpis(organizationId, batch.id, validRows);
          break;
        case 'competitors':
          imported = await insertCompetitors(organizationId, userId, batch.id, validRows);
          break;
        case 'customer_stats':
          imported = await insertCustomerStats(organizationId, batch.id, validRows);
          break;
      }
    } catch (e) {
      // Was `message: (e as Error).message` — a whole-batch write failure
      // (Prisma/DB level, row:0 meaning "not one row in particular"), not a
      // per-row validation message like the ones validateRows produces above.
      // Those describe the CALLER's own bad data and are meant to be read;
      // this one is an unexpected server-side failure and could say anything,
      // including column/schema details — logged instead, generic to the client.
      console.error('[data/import/commit] batch write failed:', e);
      allErrors.push({ row: 0, message: 'IMPORT_BATCH_FAILED' });
      // The transaction rolled back: nothing was written and no status was
      // recorded, so the shared update below has to run and say so.
      imported = 0;
      statusAlreadyWritten = false;
    }

    // Only for the three targets that do NOT write their status inside a
    // transaction (see the report: their per-row loops are too long to hold one
    // open). For them the behaviour is exactly what it was before.
    if (!statusAlreadyWritten) {
      await prisma.importBatch.update({
        where: { id: batch.id },
        data: {
          rowsImported: imported,
          rowsErrors: allErrors.length,
          status: decideStatus(imported, rows.length, allErrors.length),
          errors: JSON.stringify(allErrors.slice(0, 200)),
        },
      });
    }

    // Re-read from DB: the response reflects what was actually persisted.
    const persisted = await prisma.importBatch.findUniqueOrThrow({ where: { id: batch.id } });
    const persistedRecords = await prisma.financialRecord.count({
      where: { importBatchId: batch.id },
    });

    await auditLog({
      action: 'import.commit',
      userId,
      organizationId,
      targetType: 'import_batch',
      targetId: persisted.id,
      req,
      // Counts and status only — never the imported rows themselves.
      metadata: {
        status: persisted.status,
        rowsImported: persisted.rowsImported,
        rowsErrors: persisted.rowsErrors,
      },
    });

    return ok({
      id: persisted.id,
      fileName: persisted.fileName,
      fileSize: persisted.fileSize,
      type: persisted.type,
      status: persisted.status,
      rowsTotal: persisted.rowsTotal,
      rowsImported: persisted.rowsImported,
      rowsErrors: persisted.rowsErrors,
      persistedFinancialRecords: persistedRecords,
      errors: allErrors,
      createdAt: persisted.createdAt,
    });
  } catch (e) {
    // Was fail((e as Error).message, 500): leaked the raw error text.
    return failFromError(e);
  }
}
