import { NextRequest } from 'next/server';
import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentContext } from '@/lib/session';

export const dynamic = 'force-dynamic';

const PRIORITY_RANK: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

export async function GET(req: NextRequest) {
  try {
    const { organizationId } = await getCurrentContext();
    const sp = req.nextUrl.searchParams;
    const type = sp.get('type');
    const priority = sp.get('priority');
    const status = sp.get('status');
    const where: Record<string, unknown> = { organizationId };
    if (type) where.type = type;
    if (priority) where.priority = priority;
    if (status) where.status = status;

    const rows = await prisma.insight_b7.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const insights = rows
      .map((r) => ({
        id: r.id,
        type: r.type,
        priority: r.priority,
        status: r.status,
        title: r.title,
        summary: r.summary,
        content: r.content,
        confidence: r.confidence,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }))
      .sort(
        (a, b) =>
          (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9) ||
          (a.createdAt < b.createdAt ? 1 : -1),
      );

    return ok({ insights });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
