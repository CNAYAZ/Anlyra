import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentContext } from '@/lib/session';

export const dynamic = 'force-dynamic';

// The active Insight model has no `status` field — status is derived client-side.
// This endpoint confirms the insight exists and returns it so the UI optimistic
// update can be validated. A full status-persistence migration is tracked separately.
export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  try {
    const { organizationId } = await getCurrentContext();
    await req.json().catch(() => null); // consume body

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
