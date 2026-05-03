import { z } from 'zod';
import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import type { InsightDTO } from '@/types/ai';

export const dynamic = 'force-dynamic';

const UpdateSchema = z.object({
  status: z.enum(['NEW', 'REVIEWED', 'IMPLEMENTED', 'IGNORED']),
});

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return fail('UNAUTHORIZED', 401);
  }

  const json = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(json);
  if (!parsed.success) return fail('INVALID_INPUT', 400);

  const existing = await prisma.insight.findFirst({
    where: { id: ctx.params.id, organizationId: session.organization.id },
  });
  if (!existing) return fail('NOT_FOUND', 404);

  const updated = await prisma.insight.update({
    where: { id: existing.id },
    data: { status: parsed.data.status },
  });

  const data: InsightDTO = {
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
  };

  return ok({ insight: data });
}
