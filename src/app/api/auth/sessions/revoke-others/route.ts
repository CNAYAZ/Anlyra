import { ok, fail } from '@/lib/api';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { auditLog } from '@/lib/audit/log';
import { reissueCurrentSession } from '@/lib/auth/session-revocation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/auth/sessions/revoke-others — "sign out of all other devices".
// Writes the same revocation instant a password change writes, then hands
// THIS device a fresh token issued after it, so every other session is
// refused from its next request and only the one that pressed the button
// stays signed in. See src/lib/auth/session-revocation.ts.
//
// Identity from auth() only, like change-password: no organization is needed
// to sign out of one's own account, and a revoked or pending session sees no
// user here (session callback in src/auth.ts) and gets 401.
//
// No password asked, unlike change-password: this only ever REMOVES access,
// and an account that signs in with Google/Microsoft has no password to give.
// The trade-off: whoever holds a session could use it to sign the owner out
// elsewhere; the owner signs back in with the password, which that session
// never had to know, and can then change it.
export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return fail('UNAUTHORIZED', 401);

  await prisma.user.update({
    where: { id: userId },
    data: { sessionsRevokedAt: new Date() },
  });

  await auditLog({ action: 'auth.sessions_revoked', userId, req });

  // After the write, never before: the renewed token must not predate it.
  const res = ok({ success: true });
  const renewed = await reissueCurrentSession(req);
  if (renewed) res.cookies.set(renewed.name, renewed.value, renewed.options);
  return res;
}
