import { z } from 'zod';
import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentContext } from '@/lib/session';

export const dynamic = 'force-dynamic';

const UpdateSchema = z.object({
  status: z.enum(['NEW', 'REVIEWED', 'IMPLEMENTED', 'IGNORED']),
});

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  try {
    const { organizationId } = await getCurrentContext();
    const json = await req.json().catch(() => null);
    const parsed = UpdateSchema.safeParse(json);
    if (!parsed.success) return fail('INVALID_INPUT', 400);

    const existing = await prisma.insight_b7.findFirst({
      where: { id: ctx.params.id, organizationId },
    });
    if (!existing) return fail('NOT_FOUND', 404);

    const updated = await prisma.insight_b7.update({
      where: { id: existing.id },
      data: { status: parsed.data.status },
    });

    return ok({
      insight: {
        id: updated.id,
        type: updated.type,
        priority: updated.priority,
        status: updated.status,
        title: updated.title,
        summary: updated.summary,
        content: updated.content,
        confidence: updated.confidence,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
