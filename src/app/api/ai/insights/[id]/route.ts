import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/session';

export const dynamic = 'force-dynamic';

const VALID_STATUSES = ['NEW', 'REVIEWED', 'IMPLEMENTED', 'IGNORED'] as const;

function impactToPriority(impact: string): string {
  const i = impact.toLowerCase();
  if (i.startsWith('+') || i.includes('high') || i.includes('alt') || i.includes('critic')) return 'HIGH';
  if (i.includes('save') || i.includes('risparm') || i.includes('med')) return 'MEDIUM';
  return 'LOW';
}

function toneToType(tone: string): string {
  switch (tone.toLowerCase()) {
    case 'urgent':
    case 'negative':   return 'WARNING';
    case 'positive':   return 'OPPORTUNITY';
    case 'analytical': return 'STRATEGY';
    case 'action':     return 'ACTION';
    default:           return 'STRATEGY';
  }
}

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) return fail('Unauthorized', 401);
    const { organizationId } = authCtx;

    const body = await req.json().catch(() => null);
    if (!body || !VALID_STATUSES.includes(body.status)) {
      return fail('status must be one of NEW | REVIEWED | IMPLEMENTED | IGNORED', 422);
    }

    const existing = await prisma.insight.findFirst({
      where: { id: ctx.params.id, organizationId },
    });
    if (!existing) return fail('NOT_FOUND', 404);

    const updated = await prisma.insight.update({
      where: { id: ctx.params.id },
      data: { status: body.status },
    });

    return ok({
      insight: {
        id: updated.id,
        type: updated.type ?? toneToType(updated.tone ?? ''),
        priority: updated.priority ?? impactToPriority(updated.impact ?? ''),
        status: updated.status ?? 'NEW',
        title: updated.title,
        summary: updated.summary,
        content: updated.content ?? updated.summary,
        confidence: updated.confidence ?? 0.8,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
