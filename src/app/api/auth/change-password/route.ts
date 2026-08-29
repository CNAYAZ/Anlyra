import bcrypt from 'bcryptjs';
import { ok, fail } from '@/lib/api';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { validatePassword } from '@/lib/auth/config';
import { auditLog } from '@/lib/audit/log';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit';
import { rateLimitResponse } from '@/lib/api/rate-limit-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/auth/change-password — change the CURRENT user's password.
// Security-critical: identity comes ONLY from the real NextAuth session (auth()),
// never from getCurrentContext() which has a demo fallback. Reuses the exact
// hashing/validation pattern of reset-password (bcrypt cost 12 + validatePassword).
export async function POST(req: Request) {
  // 1. Real authenticated user only — no demo fallback.
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return fail('UNAUTHORIZED', 401);

  // 1b. Rate limit, keyed by user id (not IP: the attacker here is whoever holds
  //     the session, and they keep the same id whatever network they use).
  //     This route bcrypt-compares the CURRENT password, so without a limit a
  //     hijacked or borrowed session can brute-force it offline-fast. FAIL-CLOSED.
  const rl = await checkRateLimit('change-password-user', userId);
  if (!rl.success) return rateLimitResponse(rl);

  // 2. Read body.
  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return fail('INVALID_BODY', 400);
  }
  const currentPassword = body.currentPassword || '';
  const newPassword = body.newPassword || '';
  if (!currentPassword || !newPassword) return fail('MISSING_FIELDS', 400);

  // 3. Load the user; a passwordHash must exist (OAuth-only accounts cannot change it here).
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.passwordHash) return fail('NO_PASSWORD_SET', 400);

  // 4. Verify the current password (same check as the Credentials login).
  const currentMatches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!currentMatches) return fail('CURRENT_PASSWORD_INVALID', 400);

  // 5. New password must differ from the current one.
  const sameAsOld = await bcrypt.compare(newPassword, user.passwordHash);
  if (sameAsOld) return fail('SAME_PASSWORD', 400);

  // 6. Enforce the shared robustness policy (12 chars, upper/number/special).
  if (!validatePassword(newPassword)) {
    return fail('WEAK_PASSWORD', 400);
  }

  // 7. Hash and persist (cost factor 12, as register/reset-password).
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  // The current password was correct, so this was not a guess: clear the budget.
  await resetRateLimit('change-password-user', userId);

  await auditLog({ action: 'password.change', userId, req });
  return ok({ success: true });
}
