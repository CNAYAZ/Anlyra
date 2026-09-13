import { ok, fail } from "@/lib/api/response";
import { getAuthContext } from "@/lib/session";
import { getCreditBalance } from "@/lib/billing/repository";

/**
 * Lightweight read of the organization's CURRENT credit balance — sibling of
 * GET /api/billing/status, same reasoning, for the credits case instead of
 * the subscription case.
 *
 * WHY IT EXISTS: useCreditsStore (client) is hydrated once, server-side, by
 * CreditsHydrator when the dashboard layout renders. Right after a credit
 * pack purchase, the PURCHASED balance only moves once Stripe's webhook lands
 * (applyCreditPurchase, unrelated to this route), which can trail the
 * redirect back to /settings/billing?credits=1 by a few seconds. This route
 * lets the billing page poll for that transition without a full page reload.
 * No write, no side effect — read only, safe to call repeatedly.
 *
 * Deliberately no requireWritableOrg/requireOwnerRole: this returns the SAME
 * number every member already sees rendered on the page they're looking at
 * (the credits counter is not owner-only), same reasoning as status/route.ts.
 */
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return fail("Unauthenticated", 401);

  const credits = await getCreditBalance(ctx.organizationId);
  return ok({ credits });
}
