import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/response";
import { getAuthContext } from "@/lib/session";
import { requireWritableOrg } from '@/lib/auth/require-writable';
import { requireOwnerRole } from '@/lib/auth/require-role';
import { getStripe } from "@/lib/stripe/client";
import { getSubscription } from "@/lib/billing/repository";

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return fail("Unauthenticated", 401);
  // Demo organization: read-only. See requireWritableOrg.
  const readOnly = requireWritableOrg(ctx.organizationId);
  if (readOnly) return readOnly;
  // Billing is owner-only: the portal can cancel the subscription or change
  // plan — the exact thing this whole change exists to restrict. See
  // requireOwnerRole.
  const denied = requireOwnerRole(ctx);
  if (denied) return denied;

  const sub = await getSubscription(ctx.organizationId);
  if (!sub.stripeCustomerId) return fail("No Stripe customer for this organization", 400);

  const origin = (req.headers.get("origin") ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000").trim();

  // getStripe() throws when STRIPE_SECRET_KEY is missing, and the Stripe API
  // call below can itself throw (network failure, Stripe outage). None of
  // this was caught: the exception reached Next's default handler, which
  // answers 500 with an EMPTY body — the client's res.json() then fails with
  // "Unexpected end of JSON input", exactly the raw error the founder hit in
  // production. PAYMENT_PROVIDER_UNAVAILABLE is stable and deliberately says
  // nothing about WHY (missing key vs. Stripe being down are the same
  // problem from the customer's side: this cannot be completed right now).
  try {
    const stripe = getStripe();
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${origin}/settings/billing`,
    });

    return ok({ url: portal.url });
  } catch (e) {
    console.error("[billing/portal] Stripe call failed:", e);
    return fail("PAYMENT_PROVIDER_UNAVAILABLE", 500);
  }
}
