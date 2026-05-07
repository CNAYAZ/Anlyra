import { z } from 'zod';
import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentContext } from '@/lib/session';

export const dynamic = 'force-dynamic';

const PatchSchema = z.object({
  read: z.boolean().optional(),
});

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  try {
    const { organizationId } = await getCurrentContext();
    const json = await req.json().catch(() => null);
    const parsed = PatchSchema.safeParse(json);
    if (!parsed.success) return fail('INVALID_INPUT', 400);

    const existing = await prisma.aiAlert.findFirst({
      where: { id: ctx.params.id, organizationId },
    });
    if (!existing) return fail('NOT_FOUND', 404);

    const updated = await prisma.aiAlert.update({
      where: { id: existing.id },
      data: parsed.data,
    });
    return ok({ alert: { ...updated, createdAt: updated.createdAt.toISOString() } });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  try {
    const { organizationId } = await getCurrentContext();
    const existing = await prisma.aiAlert.findFirst({
      where: { id: ctx.params.id, organizationId },
    });
    if (!existing) return fail('NOT_FOUND', 404);
    await prisma.aiAlert.delete({ where: { id: existing.id } });
    return ok({ deleted: true });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
