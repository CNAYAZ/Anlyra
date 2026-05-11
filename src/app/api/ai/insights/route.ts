import { NextRequest } from 'next/server';
import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentContext } from '@/lib/session';

export const dynamic = 'force-dynamic';

// Derive a priority label from the impact string stored in the active Insight model.
function impactToPriority(impact: string): string {
  const i = impact.toLowerCase();
  if (i.includes('alt') || i.includes('hig') || i.includes('critic')) return 'HIGH';
  if (i.includes('med')) return 'MEDIUM';
  return 'LOW';
}

// Derive a type label from the tone string stored in the active Insight model.
function toneToType(tone: string): string {
  switch (tone.toLowerCase()) {
    case 'urgent':   return 'WARNING';
    case 'positive': return 'OPPORTUNITY';
    case 'analytical': return 'STRATEGY';
    case 'action':   return 'ACTION';
    default:         return 'INSIGHT';
  }
}

const PRIORITY_RANK: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

export async function GET(req: NextRequest) {
  try {
    const { organizationId } = await getCurrentContext();

    const rows = await prisma.insight.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });

    const insights = rows
      .map((r) => ({
        id: r.id,
        type: toneToType(r.tone),
        priority: impactToPriority(r.impact),
        status: 'NEW',
        title: r.title,
        summary: r.summary,
        content: r.summary,
        confidence: 0.8,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.createdAt.toISOString(),
      }))
      .sort(
        (a, b) =>
          (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9) ||
          (a.createdAt < b.createdAt ? 1 : -1),
      );

    // Optional client-side filters (type / priority — status not persisted on Insight model)
    const sp = req.nextUrl.searchParams;
    const typeFilter = sp.get('type');
    const priorityFilter = sp.get('priority');
    const filtered = insights.filter(
      (i) =>
        (!typeFilter || i.type === typeFilter) &&
        (!priorityFilter || i.priority === priorityFilter),
    );

    return ok({ insights: filtered });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
