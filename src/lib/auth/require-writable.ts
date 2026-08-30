import { fail } from '@/lib/api';
import { isDemoOrganization } from '@/lib/session';

/**
 * Guard for every action that WRITES, SENDS or SPENDS on behalf of an
 * organization. Refuses when the organization is the demo one.
 *
 * ── WHY A SINGLE GUARD INSTEAD OF CHECKS SCATTERED IN THE ROUTES ──
 * Same reasoning as requireManagerRole, which this deliberately mirrors: one
 * function, one definition of "not allowed", one place to audit. Twenty
 * hand-written comparisons against a magic string is how the nineteenth one
 * gets forgotten.
 *
 * ── WHY IT IS NEEDED AT ALL, GIVEN getAuthContext() ──
 * An anonymous demo visitor has no NextAuth session, so getAuthContext()
 * already returns null and every mutation answers 401. That covers the button
 * on the login page. It does NOT cover the demo ACCOUNT: demo@pro.app is a real
 * user row with a real password (created by prisma/seed.ts), so anyone who signs
 * in as it gets a genuine session on the demo organization and would otherwise
 * be able to write, send email and burn AI credits. This guard closes that path,
 * and keeps closing it if the demo is ever reached some other way.
 *
 * Usage — after resolving the organization, before doing the work:
 *   const authCtx = await getAuthContext();
 *   if (!authCtx) return fail('Unauthorized', 401);
 *   const readOnly = requireWritableOrg(authCtx.organizationId);
 *   if (readOnly) return readOnly;
 *
 * Returns a ready-to-return 403 when the action must be refused, or null when it
 * may proceed. The error code DEMO_READ_ONLY is stable and is what the UI maps
 * to a human message.
 */
export function requireWritableOrg(organizationId: string) {
  if (!isDemoOrganization(organizationId)) return null;
  return fail('DEMO_READ_ONLY', 403);
}
