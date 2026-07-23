import { NextRequest } from 'next/server';
import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentContext, getAuthContext } from '@/lib/session';
import { requireManagerRole } from '@/lib/auth/require-role';

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
    const authCtx = await getAuthContext();
    if (!authCtx) return fail('Unauthorized', 401);
    const denied = requireManagerRole(authCtx);
    if (denied) return denied;
    const { organizationId } = authCtx;
    const { id } = params;

    const batch = await prisma.importBatch.findFirst({
      where: { id, organizationId },
    });
    if (!batch) return fail('NOT_FOUND', 404);
    if (batch.status === 'ROLLED_BACK') return fail('ALREADY_ROLLED_BACK', 400);
    if (batch.status === 'CANCELLED') return fail('ALREADY_CANCELLED', 400);

    // PENDING batch (preview never committed): cancel, nothing to delete.
    if (batch.status === 'PENDING') {
      await prisma.importBatch.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });
      const persisted = await prisma.importBatch.findUniqueOrThrow({ where: { id } });
      return ok({ id: persisted.id, status: persisted.status });
    }

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

    const persisted = await prisma.importBatch.findUniqueOrThrow({ where: { id } });
    return ok({ id: persisted.id, status: persisted.status });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
