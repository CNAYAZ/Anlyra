import { NextRequest } from 'next/server';
import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentContext } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { organizationId } = await getCurrentContext();
    const sp = req.nextUrl.searchParams;
    const where: Record<string, unknown> = { organizationId };
    const type = sp.get('type');
    const severity = sp.get('severity');
    const read = sp.get('read');
    if (type) where.type = type;
    if (severity) where.severity = severity;
    if (read === 'true') where.read = true;
    if (read === 'false') where.read = false;

    const rows = await prisma.aiAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    const unreadCount = await prisma.aiAlert.count({
      where: { organizationId, read: false },
    });
    return ok({
      alerts: rows.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
      })),
      unreadCount,
    });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
