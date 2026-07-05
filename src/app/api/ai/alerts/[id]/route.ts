import { z } from 'zod';
import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/session';
import { parseStoredAnalysis } from '@/lib/alerts/ai-analysis';

export const dynamic = 'force-dynamic';

const PatchSchema = z.object({
  status: z.enum(['NEW', 'READ', 'RESOLVED', 'DISMISSED']),
});

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) return fail('Unauthorized', 401);
    const { organizationId } = authCtx;
    const json = await req.json().catch(() => null);
    const parsed = PatchSchema.safeParse(json);
    if (!parsed.success) return fail('INVALID_INPUT', 400);

    const existing = await prisma.alert.findFirst({
      where: { id: ctx.params.id, organizationId },
    });
    if (!existing) return fail('NOT_FOUND', 404);

    const updated = await prisma.alert.update({
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
        aiAnalysis: parseStoredAnalysis(updated.aiAnalysis),
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
