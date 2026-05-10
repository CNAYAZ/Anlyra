import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentContext } from '@/lib/session';
import { getImportTarget, type ImportTargetKey } from '@/lib/import-targets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  targetKey: z.string(),
  mapping: z.record(z.string(), z.union([z.string(), z.null()])),
  rows: z.array(z.record(z.string(), z.unknown())),
  fileName: z.string().default('upload'),
  fileSize: z.number().int().nonnegative().default(0),
});

type RowError = { row: number; field?: string; message: string };

function applyMapping(row: Record<string, unknown>, mapping: Record<string, string | null>) {
  const out: Record<string, unknown> = {};
  for (const [sourceCol, targetField] of Object.entries(mapping)) {
    if (!targetField || targetField === 'ignore') continue;
    out[targetField] = row[sourceCol];
  }
  return out;
}

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
    description: (r.description as string | undefined) ?? null,
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
    const { userId, organizationId } = await getCurrentContext();
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'INVALID_BODY', 400);

    const { targetKey, mapping, rows, fileName, fileSize } = parsed.data;
    const target = getImportTarget(targetKey);
    if (!target) return fail('INVALID_TARGET', 400);

    const batch = await prisma.importBatch.create({
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

    const errors: RowError[] = [];
    const validRows: Record<string, unknown>[] = [];

    rows.forEach((rawRow, idx) => {
      const mapped = applyMapping(rawRow, mapping);
      const result = target.schema.safeParse(mapped);
      if (!result.success) {
        for (const issue of result.error.issues) {
          errors.push({
            row: idx + 1,
            field: issue.path.join('.'),
            message: issue.message,
          });
        }
        return;
      }
      validRows.push(result.data as Record<string, unknown>);
    });

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
      errors.push({ row: 0, message: (e as Error).message });
    }

    const errorRate = rows.length === 0 ? 0 : errors.length / rows.length;
    const finalStatus =
      errors.length === 0
        ? 'COMPLETED'
        : errorRate < 0.1
          ? 'COMPLETED_WITH_ERRORS'
          : 'FAILED';

    const updated = await prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        rowsImported: imported,
        rowsErrors: errors.length,
        status: finalStatus,
        errors: JSON.stringify(errors.slice(0, 200)),
      },
    });

    return ok({
      id: updated.id,
      fileName: updated.fileName,
      fileSize: updated.fileSize,
      type: updated.type,
      status: updated.status,
      rowsTotal: updated.rowsTotal,
      rowsImported: updated.rowsImported,
      rowsErrors: updated.rowsErrors,
      errors,
      createdAt: updated.createdAt,
    });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
