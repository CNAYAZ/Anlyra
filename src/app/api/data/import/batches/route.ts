import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentContext } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { organizationId } = await getCurrentContext();
    const batches = await prisma.importBatch.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const data = batches.map((b) => ({
      id: b.id,
      fileName: b.fileName,
      fileSize: b.fileSize,
      type: b.type,
      status: b.status,
      rowsTotal: b.rowsTotal,
      rowsImported: b.rowsImported,
      rowsErrors: b.rowsErrors,
      createdAt: b.createdAt,
    }));
    return ok({ batches: data });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
