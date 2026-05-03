import { NextRequest } from 'next/server';
import { ok, fail } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { getCurrentContext } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { organizationId } = await getCurrentContext();
    const batch = await prisma.importBatch.findFirst({
      where: { id: params.id, organizationId },
    });
    if (!batch) return fail('notFound', 404);
    if (batch.status === 'ROLLED_BACK') return fail('alreadyRolledBack', 409);

    const result = await prisma.$transaction(async (tx) => {
      let deleted = 0;
      if (batch.type === 'REVENUE') {
        const r = await tx.revenue.deleteMany({ where: { importId: batch.id } });
        deleted = r.count;
      } else if (batch.type === 'COST') {
        const r = await tx.cost.deleteMany({ where: { importId: batch.id } });
        deleted = r.count;
      } else if (batch.type === 'KPI') {
        const r = await tx.kpi.deleteMany({ where: { importId: batch.id } });
        deleted = r.count;
      } else if (batch.type === 'COMPETITOR') {
        const r = await tx.competitor.deleteMany({ where: { importId: batch.id } });
        deleted = r.count;
      }
      await tx.importBatch.update({
        where: { id: batch.id },
        data: { status: 'ROLLED_BACK' },
      });
      return deleted;
    });

    return ok({ deleted: result });
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'rollback failed', 500);
  }
}
