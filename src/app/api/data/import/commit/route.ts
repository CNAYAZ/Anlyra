import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/session';
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

async function insertFinancialRecords(
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
  await prisma.financialRecord.createMany({ data });
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
    try {
      switch (targetKey as ImportTargetKey) {
        case 'financial_records':
          imported = await insertFinancialRecords(organizationId, batch.id, validRows);
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
      allErrors.push({ row: 0, message: (e as Error).message });
    }

    const errorRate = rows.length === 0 ? 0 : allErrors.length / rows.length;
    const finalStatus =
      imported === 0 && rows.length > 0
        ? 'FAILED'
        : allErrors.length === 0
          ? 'COMPLETED'
          : errorRate < 0.1
            ? 'COMPLETED_WITH_ERRORS'
            : 'FAILED';

    await prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        rowsImported: imported,
        rowsErrors: allErrors.length,
        status: finalStatus,
        errors: JSON.stringify(allErrors.slice(0, 200)),
      },
    });

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
    return fail((e as Error).message, 500);
  }
}
