import { ok, fail, failFromError } from '@/lib/api';
import { getAuthContext } from '@/lib/session';
import { checkOrganizationAllowance } from '@/lib/billing/server-gate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/orgs/allowance — may the SIGNED-IN ACCOUNT create one more
 * organization? Read-only wrapper around checkOrganizationAllowance, the same
 * function the creation route (api/onboarding/organization) enforces — this
 * endpoint does not decide anything on its own, it only lets the UI show the
 * real answer before the customer tries and fails.
 *
 * Not scoped to the current organization's role on purpose: creating a NEW
 * organization is an account-level action, unrelated to what the caller is
 * allowed to do inside the organization they happen to have selected right
 * now. A 'viewer' in their current org can still be the account that opens
 * its own company, so this is gated only on being signed in.
 */
export async function GET() {
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) return fail('Unauthorized', 401);
    const allowance = await checkOrganizationAllowance(authCtx.userId);
    return ok(allowance);
  } catch (e) {
    return failFromError(e);
  }
}
