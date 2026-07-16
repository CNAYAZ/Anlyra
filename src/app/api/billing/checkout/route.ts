import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api/response";
import { getAuthContext } from "@/lib/session";
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

  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch (e) {
    return fail("Invalid request body", 400);
  }

  const priceId = getStripePriceId(parsed.plan, parsed.cycle);
  if (!priceId) return fail("Price not configured for plan/cycle", 500);

  const stripe = getStripe();
  const sub = await getSubscription(ctx.organizationId);

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
}
