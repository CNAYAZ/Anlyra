import bcrypt from 'bcryptjs';
import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/session';
import { requireWritableOrg } from '@/lib/auth/require-writable';
import { isManagerRole } from '@/lib/auth/require-role';
import { getStripe } from '@/lib/stripe/client';
import { DELETION_GRACE_DAYS } from '@/lib/gdpr/constants';
import { auditLog } from '@/lib/audit/log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GDPR art. 17 — right to erasure. This endpoint REQUESTS deletion; it never
 * deletes anything itself. It stamps `deletionRequestedAt` and the purge cron
 * (/api/cron/gdpr-purge) removes the rows for good after the grace period, so a
 * mistaken or malicious click is recoverable by an operator until then.
 *
 * SCOPE, per the founder's rule:
 *   • owner/admin → their account AND the organization (with all of its data).
 *   • any other member → their own account and membership only. The organization
 *     and every business record stay untouched: a plain member cannot delete the
 *     company.
 * Other members' personal accounts are NEVER deleted, not even when the whole
 * organization goes: they simply lose this workspace.
 *
 * CONFIRMATION: the current password is required and verified with bcrypt, the
 * same check as /api/auth/change-password. A stolen session alone is not enough
 * to destroy a company.
 */
/**
 * Scope preview for the confirmation dialog: tells the UI EXACTLY what a POST
 * would destroy, decided by the same server-side role check, so the warning text
 * can never disagree with what actually happens.
 */
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return fail('UNAUTHORIZED', 401);

  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { deletionRequestedAt: true, passwordHash: true },
  });
  if (!user) return fail('NOT_FOUND', 404);

  return ok({
    organizationIncluded: isManagerRole(ctx.role),
    graceDays: DELETION_GRACE_DAYS,
    alreadyRequested: !!user.deletionRequestedAt,
    requestedAt: user.deletionRequestedAt?.toISOString() ?? null,
    canConfirmWithPassword: !!user.passwordHash,
  });
}

export async function POST(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return fail('UNAUTHORIZED', 401);
  // Demo organization: read-only. See requireWritableOrg.
  const readOnly1 = requireWritableOrg(ctx.organizationId);
  if (readOnly1) return readOnly1;
  const { userId, organizationId, role } = ctx;

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return fail('INVALID_BODY', 400);
  }
  const password = body.password || '';
  if (!password) return fail('MISSING_PASSWORD', 400);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return fail('NOT_FOUND', 404);

  // OAuth-only accounts have no password to confirm with. Refuse rather than
  // weaken the confirmation (see report: needs a re-auth flow of its own).
  if (!user.passwordHash) return fail('NO_PASSWORD_SET', 400);

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) return fail('PASSWORD_INVALID', 403);

  // Already requested: report the existing timestamp instead of resetting the
  // clock, so a double click cannot extend (or restart) the grace period.
  if (user.deletionRequestedAt) {
    return ok({
      requestedAt: user.deletionRequestedAt.toISOString(),
      organizationIncluded: false,
      subscriptionCancelled: false,
      alreadyRequested: true,
      graceDays: DELETION_GRACE_DAYS,
    });
  }

  const deletesOrganization = isManagerRole(role);
  const requestedAt = new Date();

  // Persist FIRST, Stripe after: recording the request is the legal obligation,
  // and a Stripe outage must not be able to swallow it. The reverse order could
  // cancel a paying customer's subscription without registering the deletion.
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { deletionRequestedAt: requestedAt },
    });
    if (deletesOrganization) {
      await tx.organization.update({
        where: { id: organizationId },
        data: { deletionRequestedAt: requestedAt },
      });
    }
    // JWT sessions are stateless, but the adapter writes Session rows for OAuth
    // logins: drop this user's so no server-side session survives the request.
    await tx.session.deleteMany({ where: { userId } });
  });

  // Stop the billing clock, but only when the organization itself is going away.
  // A member leaving must never cancel the company's subscription.
  let subscriptionCancelled = false;
  if (deletesOrganization) {
    try {
      const billing = await prisma.billingSubscription.findUnique({
        where: { organizationId },
        select: { stripeSubscriptionId: true, status: true },
      });
      if (billing?.stripeSubscriptionId && billing.status !== 'canceled') {
        await getStripe().subscriptions.cancel(billing.stripeSubscriptionId);
        subscriptionCancelled = true;
      }
    } catch (e) {
      // Deliberately non-fatal: the deletion request stands. Logged loudly so an
      // operator can cancel by hand in the Stripe dashboard.
      console.error(
        `[gdpr/account] Stripe cancellation FAILED for organization ${organizationId} — cancel it manually:`,
        e,
      );
    }
  }

  await auditLog({
    action: 'gdpr.account_deletion_request',
    userId,
    organizationId,
    req,
    metadata: { organizationIncluded: deletesOrganization, subscriptionCancelled },
  });

  return ok({
    requestedAt: requestedAt.toISOString(),
    organizationIncluded: deletesOrganization,
    subscriptionCancelled,
    alreadyRequested: false,
    graceDays: DELETION_GRACE_DAYS,
  });
}
