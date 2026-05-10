import { NextRequest } from 'next/server';
import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentContext } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { organizationId } = await getCurrentContext();
    const d = await prisma.customDashboard_b8.findFirst({
      where: { id: params.id, organizationId },
    });
    if (!d) return fail('NOT_FOUND', 404);
    await prisma.customDashboard_b8.delete({ where: { id: params.id } });
    return ok({ id: params.id });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
