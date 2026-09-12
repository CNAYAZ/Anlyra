import { ok, fail } from "@/lib/api/response";
import { getAuthContext } from "@/lib/session";
import { getBillingState } from "@/lib/billing/repository";

/**
 * Lightweight read of the organization's CURRENT billing state — a GET
 * counterpart to the state the dashboard layout already resolves server-side
 * once per page load (getBillingState, unchanged, same function).
 *
 * WHY IT EXISTS: BillingProvider's state (src/lib/billing/context.tsx) is
 * fixed at the moment the server rendered the page — it never re-fetches.
 * Right after a Stripe checkout, the subscription becomes "active" only when
 * the webhook lands, which can trail the redirect back to /settings/billing
 * by a few seconds. This route lets the billing page poll for that
 * transition without a full page reload. No write, no side effect — read
 * only, safe to call repeatedly.
 *
 * Deliberately no requireWritableOrg/requireOwnerRole: this returns the SAME
 * information every member already sees rendered on the billing page they're
 * looking at (plan, status, cycle) — reading it again changes nothing, so the
 * demo-read-only and owner-only guards that apply to the WRITE routes in this
 * folder (checkout, portal) do not apply here.
 */
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return fail("Unauthenticated", 401);

  const state = await getBillingState(ctx.organizationId);
  return ok(state);
}
