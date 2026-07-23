import { NextRequest } from 'next/server';
import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/session';
import { requireManagerRole } from '@/lib/auth/require-role';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) return fail('Unauthorized', 401);
    const denied = requireManagerRole(authCtx);
    if (denied) return denied;
    const { organizationId } = authCtx;
    const r = await prisma.report_b8.findFirst({ where: { id: params.id, organizationId } });
    if (!r) return fail('NOT_FOUND', 404);
    await prisma.report_b8.delete({ where: { id: params.id } });
    return ok({ id: params.id });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  // Mark report as run (on-demand generation - simulated)
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) return fail('Unauthorized', 401);
    const { organizationId } = authCtx;
    const r = await prisma.report_b8.findFirst({ where: { id: params.id, organizationId } });
    if (!r) return fail('NOT_FOUND', 404);
    const updated = await prisma.report_b8.update({
      where: { id: params.id },
      data: { lastRunAt: new Date() },
    });
    return ok({ id: updated.id, lastRunAt: updated.lastRunAt });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
