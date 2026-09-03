import { randomBytes } from 'crypto';
import { NextRequest } from 'next/server';
import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/session';
import { requireWritableOrg } from '@/lib/auth/require-writable';
import { requireManagerRole } from '@/lib/auth/require-role';
import { auditLog } from '@/lib/audit/log';
import { SHARE_LINK_TTL_DAYS } from '@/lib/reports/share';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Creates a PUBLIC share link for a report.
 *
 * OWNER/ADMIN ONLY (requireManagerRole): the link exposes the company's revenue,
 * costs and cashflow to anyone holding the URL, with no login. That is a
 * management decision, not an everyday one. (Recommendation, NOT implemented:
 * if the founder wants every member to be able to share, drop this guard — but
 * then a 'viewer' can publish the accounts.)
 *
 * The token is generated HERE, server-side, with crypto.randomBytes(32) — the
 * old link came from Math.random() in the browser and lived only in that
 * browser's localStorage, which is why a shared link never worked on another
 * device.
 */
export async function POST(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
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
    const report = await prisma.report_b8.findFirst({
      where: { id: params.id, organizationId },
    });
    if (!report) return fail('NOT_FOUND', 404);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + SHARE_LINK_TTL_DAYS * 24 * 60 * 60 * 1000);

    // 32 random bytes, URL-safe. Re-issued on every call, so "share again" after a
    // revoke produces a NEW secret and the old URL stays dead.
    const token = randomBytes(32).toString('base64url');

    const updated = await prisma.report_b8.update({
      where: { id: report.id },
      data: { shareToken: token, shareCreatedAt: now, shareExpiresAt: expiresAt },
      select: { shareToken: true, shareCreatedAt: true, shareExpiresAt: true },
    });

    // The share link exposes company figures to anyone holding the URL, with no
    // login — worth a trail row. The TOKEN ITSELF IS NEVER RECORDED: it is a
    // credential, and an audit table is not the place for one.
    await auditLog({
      action: 'report.share_link_created',
      userId: authCtx.userId,
      organizationId,
      targetType: 'report',
      targetId: report.id,
      req: _req,
    });

    return ok({
      shareToken: updated.shareToken,
      createdAt: updated.shareCreatedAt,
      expiresAt: updated.shareExpiresAt,
      ttlDays: SHARE_LINK_TTL_DAYS,
    });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}

/** Revokes the link: the token is cleared, so the public URL stops resolving. */
export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) return fail('Unauthorized', 401);
    // Demo organization: read-only. See requireWritableOrg.
    const readOnly1 = requireWritableOrg(authCtx.organizationId);
    if (readOnly1) return readOnly1;
    const denied = requireManagerRole(authCtx);
    if (denied) return denied;

    const { organizationId } = authCtx;
    const report = await prisma.report_b8.findFirst({
      where: { id: params.id, organizationId },
    });
    if (!report) return fail('NOT_FOUND', 404);

    await prisma.report_b8.update({
      where: { id: report.id },
      data: { shareToken: null, shareCreatedAt: null, shareExpiresAt: null },
    });

    return ok({ revoked: true });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
