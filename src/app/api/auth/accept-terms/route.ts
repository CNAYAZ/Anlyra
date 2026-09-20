import { ok, fail } from '@/lib/api';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { auditLog } from '@/lib/audit/log';
import { CURRENT_LEGAL_VERSION } from '@/lib/legal/version';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/accept-terms — records that the SIGNED-IN user has accepted
 * the current Privacy Policy + Terms of Service, when the legal pages have
 * moved on since their last (or only) acceptance. The other side of this is
 * LegalReacceptBanner, which is what calls this route.
 *
 * Identity comes ONLY from the real NextAuth session (auth()) — same rule as
 * change-password: no demo fallback, because this writes to a real account.
 *
 * IDEMPOTENT ON PURPOSE: if the stored version already matches
 * CURRENT_LEGAL_VERSION, this returns success without writing anything. A
 * double click, a retried request, or the banner re-rendering before its
 * parent re-fetches must not produce a second `auth.terms_accepted` audit row
 * claiming a second, separate acceptance that never happened.
 */
export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return fail('UNAUTHORIZED', 401);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { termsAcceptedVersion: true },
  });
  if (!user) return fail('UNAUTHORIZED', 401);

  if (user.termsAcceptedVersion === CURRENT_LEGAL_VERSION) {
    return ok({ version: CURRENT_LEGAL_VERSION, alreadyAccepted: true });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { termsAcceptedVersion: CURRENT_LEGAL_VERSION },
  });

  // Same action as the one written at registration (auth.terms_accepted) —
  // deliberately, not a new one: it is the same fact, "this person accepted
  // this version of the documents", happening a second time for a different
  // reason. `reacceptance: true` is what tells the two apart in the log.
  // Exempt from the 12-month audit-log retention sweep for the same reason as
  // the original row — see AUDIT_RETENTION_EXEMPT_ACTIONS in
  // @/lib/audit/retention: this action name is exempted as a whole, so this
  // row inherits that protection with no extra code.
  await auditLog({
    action: 'auth.terms_accepted',
    userId,
    req,
    metadata: { version: CURRENT_LEGAL_VERSION, reacceptance: true },
  });

  return ok({ version: CURRENT_LEGAL_VERSION, alreadyAccepted: false });
}
