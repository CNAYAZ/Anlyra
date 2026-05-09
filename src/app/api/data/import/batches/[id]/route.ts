import { NextRequest } from 'next/server';
import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentContext } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { organizationId } = await getCurrentContext();
    const { id } = params;

    const batch = await prisma.importBatch.findFirst({
      where: { id, organizationId },
    });
    if (!batch) return fail('NOT_FOUND', 404);

    // Collect all related records by importBatchId
    const [financialRecords, kpiRecords, customerStats, competitors] = await Promise.all([
      prisma.financialRecord.findMany({ where: { importBatchId: id }, orderBy: { createdAt: 'desc' } }),
      prisma.kPI.findMany({ where: { importBatchId: id }, orderBy: { updatedAt: 'desc' } }),
      prisma.customerStat.findMany({ where: { importBatchId: id } }),
      prisma.competitor.findMany({ where: { importId: id }, orderBy: { createdAt: 'desc' } }),
    ]);

    const records = [
      ...financialRecords.map((r) => ({ _type: 'financial_record', ...r })),
      ...kpiRecords.map((r) => ({ _type: 'kpi', ...r })),
      ...customerStats.map((r) => ({ _type: 'customer_stat', ...r })),
      ...competitors.map((r) => ({ _type: 'competitor', ...r })),
    ];

    const errors = batch.errors ? (JSON.parse(batch.errors) as unknown[]) : [];

    return ok({ batch, records, errors });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { organizationId } = await getCurrentContext();
    const { id } = params;

    const batch = await prisma.importBatch.findFirst({
      where: { id, organizationId },
    });
    if (!batch) return fail('NOT_FOUND', 404);
    if (batch.status === 'ROLLED_BACK') return fail('ALREADY_ROLLED_BACK', 400);

    // Transactional rollback: delete all records linked to this batch, then mark batch
    await prisma.$transaction(async (tx) => {
      await tx.financialRecord.deleteMany({ where: { importBatchId: id } });
      await tx.kPI.deleteMany({ where: { importBatchId: id } });
      await tx.customerStat.deleteMany({ where: { importBatchId: id } });
      await tx.competitor.deleteMany({ where: { importId: id } });
      await tx.importBatch.update({
        where: { id },
        data: { status: 'ROLLED_BACK' },
      });
    });

    return ok({ id, status: 'ROLLED_BACK' });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
