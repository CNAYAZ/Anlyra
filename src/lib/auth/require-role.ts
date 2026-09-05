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

/**
 * Billing is narrower than the manager set above: only 'owner' may open the
 * Stripe portal or start a checkout (subscription or credit pack). Founder
 * decision — an 'admin' manages the business day to day but does not own it,
 * and today anyone with the Stripe portal link can cancel the subscription or
 * change plan regardless of role.
 *
 * Deliberately a SEPARATE constant/guard from MANAGER_ROLES/requireManagerRole
 * above, not a narrowing of it: those two are used by 12 other routes that
 * must keep admitting 'admin', and are not touched here.
 */
export const OWNER_ROLES = ['owner'] as const;

export type OwnerRole = (typeof OWNER_ROLES)[number];

export function isOwnerRole(role: string | null | undefined): boolean {
  return (
    typeof role === 'string' &&
    (OWNER_ROLES as readonly string[]).includes(role.toLowerCase())
  );
}

/**
 * Guard for owner-only actions (billing). Call it AFTER getAuthContext(),
 * passing the authenticated context. Returns a ready-to-return 403 response
 * when the role is NOT owner, or `null` when the action is allowed.
 *
 * FAIL-CLOSED: a missing, empty or unknown role is DENIED.
 *
 * Usage:
 *   const authCtx = await getAuthContext();
 *   if (!authCtx) return fail('Unauthorized', 401);
 *   const denied = requireOwnerRole(authCtx);
 *   if (denied) return denied;
 */
export function requireOwnerRole(ctx: Pick<AuthContext, 'role'>) {
  if (isOwnerRole(ctx.role)) return null;
  return fail('Non hai i permessi per questa azione', 403);
}
