import { NextRequest } from 'next/server';
import { ok, fail } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { getCurrentContext } from '@/lib/session';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest) {
  try {
    const { organizationId } = await getCurrentContext();
    const imports = await prisma.importBatch.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        fileName: true,
        type: true,
        rowsTotal: true,
        rowsImported: true,
        rowsErrors: true,
        status: true,
        createdAt: true,
      },
    });
    return ok({ items: imports });
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'fetch failed', 500);
  }
}
