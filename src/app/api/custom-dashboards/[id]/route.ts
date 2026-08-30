import { NextRequest } from 'next/server';
import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getAuthContext, getCurrentContext } from '@/lib/session';
import { requireManagerRole } from '@/lib/auth/require-role';
import { auditLog } from '@/lib/audit/log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET one dashboard.
 *
 * A NEW handler, and the only one added by this change — justified because the
 * view page needs exactly one dashboard by id. The alternative was to reuse the
 * list endpoint and filter client-side, which would ship every dashboard of the
 * organization (widgets JSON included) to render one of them.
 *
 * Ownership is enforced by the query itself: the row must match BOTH the id and
 * the caller's organizationId, so a guessed id from another tenant returns 404
 * rather than someone else's layout.
 *
 * getCurrentContext (not getAuthContext) to match the list endpoint above it:
 * this is a read, and the two must agree on which organization they are showing.
 */
export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const { organizationId } = await getCurrentContext();
    const d = await prisma.customDashboard_b8.findFirst({
      where: { id: params.id, organizationId },
    });
    if (!d) return fail('NOT_FOUND', 404);
    return ok({
      dashboard: {
        id: d.id,
        name: d.name,
        description: d.description,
        // Stored as a JSON string; widgets saved before per-widget options
        // existed simply have no `config` key and the reader defaults them.
        widgets: JSON.parse(d.widgets),
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      },
    });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) return fail('Unauthorized', 401);
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
