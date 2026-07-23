import { fail } from '@/lib/api';
import type { AuthContext } from '@/lib/session';

/**
 * Membership roles allowed to perform DESTRUCTIVE actions (delete business data,
 * roll back an import) and to change ORGANIZATION settings / integrations.
 *
 * These are the REAL Membership.role strings used across the codebase
 * (src/lib/session.ts and src/app/api/onboarding/organization/route.ts).
 * Membership.role is a plain String column (no Prisma enum); the four values in
 * use are 'owner', 'admin', 'editor' and 'viewer'. Founder decision: only
 * 'owner' and 'admin' may manage or destroy. Reading and adding data stays open
 * to every member and is NOT gated here.
 */
export const MANAGER_ROLES = ['owner', 'admin'] as const;

export type ManagerRole = (typeof MANAGER_ROLES)[number];

export function isManagerRole(role: string | null | undefined): boolean {
  return (
    typeof role === 'string' &&
    (MANAGER_ROLES as readonly string[]).includes(role.toLowerCase())
  );
}

/**
 * Guard for owner/admin-only actions. Call it AFTER getAuthContext(), passing
 * the authenticated context. Returns a ready-to-return 403 response when the
 * role is NOT owner/admin, or `null` when the action is allowed.
 *
 * FAIL-CLOSED: a missing, empty or unknown role is DENIED.
 *
 * Usage:
 *   const authCtx = await getAuthContext();
 *   if (!authCtx) return fail('Unauthorized', 401);
 *   const denied = requireManagerRole(authCtx);
 *   if (denied) return denied;
 */
export function requireManagerRole(ctx: Pick<AuthContext, 'role'>) {
  if (isManagerRole(ctx.role)) return null;
  return fail('Non hai i permessi per questa azione', 403);
}
