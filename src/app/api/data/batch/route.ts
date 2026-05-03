import { NextRequest } from 'next/server';
import { ok, fail } from '@/lib/api-response';
import { batchSchema } from '@/lib/validators';
import { prisma } from '@/lib/prisma';
import { getCurrentContext } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = batchSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'invalid', 400);

  const { userId, organizationId } = await getCurrentContext();

  try {
    if (parsed.data.type === 'REVENUE') {
      const res = await prisma.revenue.createMany({
        data: parsed.data.data.map((r) => ({ ...r, userId, organizationId })),
      });
      return ok({ count: res.count });
    }
    if (parsed.data.type === 'COST') {
      const res = await prisma.cost.createMany({
        data: parsed.data.data.map((r) => ({ ...r, userId, organizationId })),
      });
      return ok({ count: res.count });
    }
    if (parsed.data.type === 'KPI') {
      const res = await prisma.kpi.createMany({
        data: parsed.data.data.map((r) => ({ ...r, userId, organizationId })),
      });
      return ok({ count: res.count });
    }
    const res = await prisma.competitor.createMany({
      data: parsed.data.data.map((c) => ({
        ...c,
        website: c.website || null,
        userId,
        organizationId,
      })),
    });
    return ok({ count: res.count });
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'save failed', 500);
  }
}
