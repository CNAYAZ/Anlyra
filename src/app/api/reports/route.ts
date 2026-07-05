import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentContext, getAuthContext } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().optional(),
  sections: z.array(z.string()).min(1),
  schedule: z.enum(['on_demand', 'weekly', 'monthly']).default('on_demand'),
  recipients: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { organizationId } = await getCurrentContext();
    const sp = req.nextUrl.searchParams;
    const onlyScheduled = sp.get('scheduled') === '1';

    const where: { organizationId: string; schedule?: { not: null } } = { organizationId };
    if (onlyScheduled) where.schedule = { not: null };

    const reports = await prisma.report_b8.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const data = reports
      .filter((r) => !onlyScheduled || (r.schedule && r.schedule !== 'on_demand'))
      .map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        sections: JSON.parse(r.sections) as string[],
        schedule: r.schedule,
        recipients: r.recipients,
        lastRunAt: r.lastRunAt,
        createdAt: r.createdAt,
      }));

    return ok({ reports: data });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) return fail('Unauthorized', 401);
    const { organizationId } = authCtx;
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'INVALID', 400);

    const created = await prisma.report_b8.create({
      data: {
        organizationId,
        title: parsed.data.title,
        description: parsed.data.description,
        sections: JSON.stringify(parsed.data.sections),
        schedule: parsed.data.schedule === 'on_demand' ? null : parsed.data.schedule,
        recipients: parsed.data.recipients ?? null,
      },
    });
    return ok({ id: created.id });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
