import { NextRequest } from 'next/server';
import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/session';
import { requireWritableOrg } from '@/lib/auth/require-writable';
import { requireManagerRole } from '@/lib/auth/require-role';
import { auditLog } from '@/lib/audit/log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) return fail('Unauthorized', 401);
    // Demo organization: read-only. See requireWritableOrg.
    const readOnly = requireWritableOrg(authCtx.organizationId);
    if (readOnly) return readOnly;
    const denied = requireManagerRole(authCtx);
    if (denied) return denied;
    const { organizationId } = authCtx;
    const d = await prisma.customDashboard_b8.findFirst({
      where: { id: params.id, organizationId },
    });
    if (!d) return fail('NOT_FOUND', 404);
    await prisma.customDashboard_b8.delete({ where: { id: params.id } });
    await auditLog({
      action: 'custom_dashboard.delete',
      userId: authCtx.userId,
      organizationId,
      targetType: 'custom_dashboard',
      targetId: params.id,
      req: _req,
    });
    return ok({ id: params.id });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
