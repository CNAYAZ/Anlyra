import { NextRequest } from 'next/server';
import { ok, fail } from '@/lib/api-response';
import { manualSchema } from '@/lib/validators';
import { prisma } from '@/lib/prisma';
import { getCurrentContext } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = manualSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'invalid', 400);

  const { userId, organizationId } = await getCurrentContext();

  try {
    if (parsed.data.type === 'REVENUE') {
      const created = await prisma.revenue.create({
        data: { ...parsed.data.data, userId, organizationId },
      });
      return ok({ id: created.id });
    }
    if (parsed.data.type === 'COST') {
      const created = await prisma.cost.create({
        data: { ...parsed.data.data, userId, organizationId },
      });
      return ok({ id: created.id });
    }
    if (parsed.data.type === 'KPI') {
      const created = await prisma.kpi.create({
        data: { ...parsed.data.data, userId, organizationId },
      });
      return ok({ id: created.id });
    }
    const created = await prisma.competitor.create({
      data: {
        ...parsed.data.data,
        website: parsed.data.data.website || null,
        userId,
        organizationId,
      },
    });
    return ok({ id: created.id });
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'save failed', 500);
  }
}
