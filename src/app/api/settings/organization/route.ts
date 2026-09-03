import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, fail, failFromError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentContext, getAuthContext } from '@/lib/session';
import { requireWritableOrg } from '@/lib/auth/require-writable';
import { requireManagerRole } from '@/lib/auth/require-role';
import { auditLog } from '@/lib/audit/log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  industry: z.string().min(1).optional(),
  employees: z.number().int().nonnegative().optional(),
  country: z.string().length(2).optional(),
  currency: z.string().min(3).max(3).optional(),
});

export async function GET() {
  try {
    const { organizationId } = await getCurrentContext();
    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) return fail('NOT_FOUND', 404);
    return ok(org);
  } catch (e) {
    return failFromError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) return fail('Unauthorized', 401);
    // Demo organization: read-only. See requireWritableOrg.
    const readOnly = requireWritableOrg(authCtx.organizationId);
    if (readOnly) return readOnly;
    const denied = requireManagerRole(authCtx);
    if (denied) return denied;
    const { organizationId } = authCtx;
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'INVALID', 400);
    const updated = await prisma.organization.update({ where: { id: organizationId }, data: parsed.data });
    await auditLog({
      action: 'organization.update',
      userId: authCtx.userId,
      organizationId,
      targetType: 'organization',
      targetId: organizationId,
      req,
      // Field NAMES only — never the values, which are company data.
      metadata: { fields: Object.keys(parsed.data).join(',') },
    });
    return ok(updated);
  } catch (e) {
    return failFromError(e);
  }
}
