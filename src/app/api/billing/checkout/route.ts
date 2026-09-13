import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api/response";
import { getAuthContext } from "@/lib/session";
import { requireWritableOrg } from '@/lib/auth/require-writable';
import { requireOwnerRole } from '@/lib/auth/require-role';
import { getStripe } from "@/lib/stripe/client";
import { getStripePriceId } from "@/lib/stripe/prices";
import { getSubscription, setSubscription } from "@/lib/billing/repository";

const Body = z.object({
  plan: z.enum(["PRO", "ADVANCED", "ENTERPRISE"]),
  cycle: z.enum(["monthly", "yearly"]),
});

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return fail("Unauthenticated", 401);
  // Demo organization: read-only. See requireWritableOrg.
  const readOnly = requireWritableOrg(ctx.organizationId);
  if (readOnly) return readOnly;
  // Billing is owner-only: starting a subscription binds the organization to
  // a paying plan. See requireOwnerRole.
  const denied = requireOwnerRole(ctx);
  if (denied) return denied;

  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch (e) {
    return fail("Invalid request body", 400);
  }

  const priceId = getStripePriceId(parsed.plan, parsed.cycle);
  if (!priceId) {
    // Same symptom as the missing-Stripe-key case below, different cause: a
    // STRIPE_PRICE_* env var for this specific plan/cycle was never set. The
    // raw message used to reach the client verbatim (getStripePriceId's own
    // wording, meant for a developer reading code, not a customer paying
    // money). PRICE_NOT_CONFIGURED is stable and, like
    // PAYMENT_PROVIDER_UNAVAILABLE, says nothing about which variable is
    // missing — the real reason goes to the log line instead.
    console.error(`[billing/checkout] price not configured for plan=${parsed.plan} cycle=${parsed.cycle}`);
    return fail("PRICE_NOT_CONFIGURED", 500);
  }

  const sub = await getSubscription(ctx.organizationId);

  // getStripe() throws when STRIPE_SECRET_KEY is missing, and any of the
  // Stripe API calls below can themselves throw (network failure, Stripe
  // outage, a bad price id it doesn't recognize). None of this was caught:
  // the exception reached Next's default handler, which answers 500 with an
  // EMPTY body — the client's res.json() then fails with "Unexpected end of
  // JSON input", exactly the raw error the founder hit in production.
  // PAYMENT_PROVIDER_UNAVAILABLE is stable and deliberately says nothing
  // about WHY (missing key vs. Stripe being down are the same problem from
  // the customer's side: this cannot be completed right now).
  try {
    const stripe = getStripe();

    let customerId = sub.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: ctx.email ?? undefined,
        metadata: { orgId: ctx.organizationId, userId: ctx.userId },
      });
      customerId = customer.id;
      await setSubscription({ ...sub, stripeCustomerId: customerId });
    }

    // Prefer a fixed, trusted base URL over the client-supplied Origin header for
    // the Stripe redirect targets (avoids relying on an attacker-controllable header).
    const origin = (
      process.env.NEXT_PUBLIC_SITE_URL ?? req.headers.get("origin") ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000"
    ).trim();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/settings/billing?success=1`,
      cancel_url: `${origin}/settings/billing?canceled=1`,
      allow_promotion_codes: true,
      metadata: {
        orgId: ctx.organizationId,
        plan: parsed.plan,
        cycle: parsed.cycle,
        kind: "subscription",
      },
      subscription_data: {
        metadata: { orgId: ctx.organizationId, plan: parsed.plan, cycle: parsed.cycle },
      },
    });

    return ok({ url: session.url });
  } catch (e) {
    console.error("[billing/checkout] Stripe call failed:", e);
    return fail("PAYMENT_PROVIDER_UNAVAILABLE", 500);
  }
}
