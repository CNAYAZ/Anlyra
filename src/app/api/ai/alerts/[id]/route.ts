import { z } from 'zod';
import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentContext } from '@/lib/session';

export const dynamic = 'force-dynamic';

const PatchSchema = z.object({
  status: z.enum(['NEW', 'READ', 'RESOLVED', 'DISMISSED']),
});

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  try {
    const { organizationId } = await getCurrentContext();
    const json = await req.json().catch(() => null);
    const parsed = PatchSchema.safeParse(json);
    if (!parsed.success) return fail('INVALID_INPUT', 400);

    const existing = await prisma.alert_b7.findFirst({
      where: { id: ctx.params.id, organizationId },
    });
    if (!existing) return fail('NOT_FOUND', 404);

    const updated = await prisma.alert_b7.update({
      where: { id: existing.id },
      data: { status: parsed.data.status },
    });

    return ok({
      alert: {
        id: updated.id,
        severity: updated.severity,
        status: updated.status,
        title: updated.title,
        description: updated.description,
        source: updated.source,
        recommendation: updated.recommendation,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
