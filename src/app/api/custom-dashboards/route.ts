import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, fail, failFromError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentContext, getAuthContext } from '@/lib/session';
import { requireWritableOrg } from '@/lib/auth/require-writable';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().optional(),
  widgets: z.array(z.object({
    id: z.string(),
    type: z.string(),
    title: z.string(),
    config: z.record(z.string(), z.unknown()).optional(),
  })).min(1),
});

export async function GET() {
  try {
    const { organizationId } = await getCurrentContext();
    const dashboards = await prisma.customDashboard_b8.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
    const data = dashboards.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      widgets: JSON.parse(d.widgets),
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));
    return ok({ dashboards: data });
  } catch (e) {
    return failFromError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) return fail('Unauthorized', 401);
    // Demo organization: read-only. See requireWritableOrg.
    const readOnly = requireWritableOrg(authCtx.organizationId);
    if (readOnly) return readOnly;
    const { organizationId } = authCtx;
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'INVALID', 400);
    const created = await prisma.customDashboard_b8.create({
      data: {
        organizationId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        widgets: JSON.stringify(parsed.data.widgets),
      },
    });
    return ok({ id: created.id });
  } catch (e) {
    return failFromError(e);
  }
}
