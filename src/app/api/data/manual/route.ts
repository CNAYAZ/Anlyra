import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/session';
import { getImportTarget, type ImportTargetKey } from '@/lib/import-targets';
import { ensureImportBatchFkRows } from '@/lib/import/batch-fk';
import { buildFinancialDescription } from '@/lib/import/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  targetKey: z.string(),
  records: z.array(z.record(z.string(), z.unknown())).min(1),
});

type RowError = { row: number; field?: string; message: string };

export async function POST(req: NextRequest) {
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) return fail('Unauthorized', 401);
    const { userId, organizationId } = authCtx;
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'INVALID_BODY', 400);

    const { targetKey, records } = parsed.data;
    const target = getImportTarget(targetKey);
    if (!target) return fail('INVALID_TARGET', 400);

    // Validate all rows before writing anything
    const errors: RowError[] = [];
    const validRows: Record<string, unknown>[] = [];
    records.forEach((row, idx) => {
      const result = target.schema.safeParse(row);
      if (!result.success) {
        for (const issue of result.error.issues) {
          errors.push({ row: idx + 1, field: issue.path.join('.'), message: issue.message });
        }
      } else {
        validRows.push(result.data as Record<string, unknown>);
      }
    });

    if (errors.length > 0) {
      return fail(JSON.stringify({ validationErrors: errors }), 422);
    }

    // ImportBatch has a physical FK to User_b4/Organization_b4 (see batch-fk.ts);
    // must run before the transaction since it's outside it.
    await ensureImportBatchFkRows(userId, organizationId);

    // Transactional: create batch + all records atomically
    const batchId = await prisma.$transaction(async (tx) => {
      const batch = await tx.importBatch.create({
        data: {
          userId,
          organizationId,
          source: 'manual',
          type: targetKey,
          rowsTotal: validRows.length,
          rowsImported: 0,
          status: 'PROCESSING',
        },
      });

      let imported = 0;

      if ((targetKey as ImportTargetKey) === 'financial_records') {
        await tx.financialRecord.createMany({
          data: validRows.map((r) => ({
            organizationId,
            importBatchId: batch.id,
            amount: r.amount as number,
            type: r.type as string,
            occurredAt: new Date(r.occurredAt as string),
            description: buildFinancialDescription(r),
            source: 'manual',
          })),
        });
        imported = validRows.length;
      } else if ((targetKey as ImportTargetKey) === 'kpis') {
        for (const r of validRows) {
          await tx.kPI.create({
            data: {
              organizationId,
              importBatchId: batch.id,
              name: r.name as string,
              value: r.value as number,
              unit: (r.unit as string | undefined) ?? null,
              target: (r.target as number | undefined) ?? null,
            },
          });
          imported++;
        }
      } else if ((targetKey as ImportTargetKey) === 'competitors') {
        for (const r of validRows) {
          await tx.competitor.create({
            data: {
              userId,
              organizationId,
              importId: batch.id,
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
          imported++;
        }
      } else if ((targetKey as ImportTargetKey) === 'customer_stats') {
        for (const r of validRows) {
          await tx.customerStat.upsert({
            where: { organizationId_period: { organizationId, period: r.period as string } },
            update: {
              importBatchId: batch.id,
              activeCustomers: r.activeCustomers as number,
              newCustomers: r.newCustomers as number,
              churnedCustomers: r.churnedCustomers as number,
            },
            create: {
              organizationId,
              importBatchId: batch.id,
              period: r.period as string,
              activeCustomers: r.activeCustomers as number,
              newCustomers: r.newCustomers as number,
              churnedCustomers: r.churnedCustomers as number,
            },
          });
          imported++;
        }
      }

      await tx.importBatch.update({
        where: { id: batch.id },
        data: { rowsImported: imported, status: 'COMPLETED' },
      });

      return batch.id;
    });

    return ok({ batchId, recordsCreated: validRows.length, errors: [] });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
