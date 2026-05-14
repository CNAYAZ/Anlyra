import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentContext } from '@/lib/session';

export const dynamic = 'force-dynamic';

// The Insight DB table has 7 columns (id, organizationId, title, summary, impact, tone, createdAt).
// status/type/priority/content/confidence are derived by the GET route, not stored.
// PATCH acknowledges the request and returns the insight with status='REVIEWED' for optimistic UI.
export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  try {
    const { organizationId } = await getCurrentContext();
    await req.json().catch(() => null);

    const existing = await prisma.insight.findFirst({
      where: { id: ctx.params.id, organizationId },
    });
    if (!existing) return fail('NOT_FOUND', 404);

    return ok({
      insight: {
        id: existing.id,
        type: 'INSIGHT',
        priority: 'MEDIUM',
        status: 'REVIEWED',
        title: existing.title,
        summary: existing.summary,
        content: existing.summary,
        confidence: 0.8,
        createdAt: existing.createdAt.toISOString(),
        updatedAt: existing.createdAt.toISOString(),
      },
    });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
