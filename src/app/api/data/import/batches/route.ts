import { NextRequest } from 'next/server';
import { ok, fail, failFromError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentContext } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { organizationId } = await getCurrentContext();
    const sp = req.nextUrl.searchParams;

    const source = sp.get('source') ?? 'all'; // file | manual | all
    const status = sp.get('status') ?? '';
    const from = sp.get('from') ? new Date(sp.get('from')!) : undefined;
    const to = sp.get('to') ? new Date(sp.get('to')! + 'T23:59:59') : undefined;

    const where: Record<string, unknown> = { organizationId };
    if (source !== 'all') where.source = source;
    if (status) where.status = status;
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      };
    }

    const batches = await prisma.importBatch.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const data = batches.map((b) => ({
      id: b.id,
      fileName: b.fileName,
      fileSize: b.fileSize,
      source: b.source,
      type: b.type,
      status: b.status,
      rowsTotal: b.rowsTotal,
      rowsImported: b.rowsImported,
      rowsErrors: b.rowsErrors,
      createdAt: b.createdAt,
    }));

    return ok({ batches: data });
  } catch (e) {
    return failFromError(e);
  }
}
