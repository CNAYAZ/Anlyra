import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/session";
import { getStripe } from "@/lib/stripe/client";
import { getStripePriceId } from "@/lib/stripe/prices";
import { getSubscription, setSubscription } from "@/lib/billing/repository";

const Body = z.object({
  plan: z.enum(["PRO", "ADVANCED", "ENTERPRISE"]),
  cycle: z.enum(["monthly", "yearly"]),
});

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return fail("Unauthenticated", 401);
  }

  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch (e) {
    return fail("Invalid request body", 400);
  }

  const priceId = getStripePriceId(parsed.plan, parsed.cycle);
  if (!priceId) return fail("Price not configured for plan/cycle", 500);

  const stripe = getStripe();
  const sub = await getSubscription(user.orgId);

  let customerId = sub.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { orgId: user.orgId, userId: user.id },
    });
    customerId = customer.id;
    await setSubscription({ ...sub, stripeCustomerId: customerId });
  }

  const origin = req.headers.get("origin") ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/settings/billing?success=1`,
    cancel_url: `${origin}/settings/billing?canceled=1`,
    allow_promotion_codes: true,
    metadata: {
      orgId: user.orgId,
      plan: parsed.plan,
      cycle: parsed.cycle,
      kind: "subscription",
    },
    subscription_data: {
      metadata: { orgId: user.orgId, plan: parsed.plan, cycle: parsed.cycle },
    },
  });

  return ok({ url: session.url });
}
