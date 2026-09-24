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
 * 'owner' and 'admin' may manage or destroy. Reading stays open to every
 * member; adding and changing data is open to every member EXCEPT 'viewer' —
 * see EDITOR_ROLES / requireEditorRole below. (This sentence used to say
 * "reading and adding data stays open to every member", which is exactly what
 * let a viewer write.)
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
 * Membership roles allowed to CREATE or CHANGE the organization's data, or to
 * spend its AI credits. Everyone except 'viewer'.
 *
 * Until this existed, nothing in the code told 'editor' and 'viewer' apart:
 * the comment on MANAGER_ROLES above said "reading and adding data stays open
 * to every member", and a member invited as 'viewer' — the role an owner picks
 * precisely to give read-only access, to an accountant say — could create
 * receivables, import files, generate insights and burn credits exactly like
 * an 'editor'. Founder decision: 'viewer' reads, and nothing else.
 *
 * NOT applied to actions on one's OWN account (profile, notification
 * preferences, password, 2FA, sessions, GDPR, bug reports, creating one's own
 * organization): a viewer of this organization is still the owner of their own
 * account. NOT needed either on routes already behind requireManagerRole or
 * requireOwnerRole, which refuse 'viewer' already.
 *
 * Same shape as MANAGER_ROLES/OWNER_ROLES; a third, WIDER set rather than a
 * change to them — those keep excluding 'editor' exactly as before.
 */
export const EDITOR_ROLES = ['owner', 'admin', 'editor'] as const;

export function isEditorRole(role: string | null | undefined): boolean {
  return (
    typeof role === 'string' &&
    (EDITOR_ROLES as readonly string[]).includes(role.toLowerCase())
  );
}

/**
 * Guard for every route that writes organization data or spends its credits.
 * Call it AFTER getAuthContext(). Returns a ready-to-return 403 when the role
 * may only read, or `null` when the action is allowed.
 *
 * FAIL-CLOSED like the two guards around it: a missing, empty or unknown role
 * is treated as read-only. The error is a stable CODE, VIEWER_READ_ONLY, not a
 * sentence — the same convention as DEMO_READ_ONLY (require-writable.ts): the
 * UI maps it to a message in the user's language.
 *
 * Usage:
 *   const authCtx = await getAuthContext();
 *   if (!authCtx) return fail('Unauthorized', 401);
 *   const viewerOnly = requireEditorRole(authCtx);
 *   if (viewerOnly) return viewerOnly;
 */
export function requireEditorRole(ctx: Pick<AuthContext, 'role'>) {
  if (isEditorRole(ctx.role)) return null;
  return fail('VIEWER_READ_ONLY', 403);
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
