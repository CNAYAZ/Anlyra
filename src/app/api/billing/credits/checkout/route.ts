import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/session";
import { getStripe } from "@/lib/stripe/client";
import { getCreditPackPriceId } from "@/lib/stripe/prices";
import { CREDIT_PACKS } from "@/lib/billing/plans";
import { getSubscription, setSubscription } from "@/lib/billing/repository";

const Body = z.object({
  packId: z.enum(["credits_50", "credits_200", "credits_500"]),
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
  } catch {
    return fail("Invalid request body", 400);
  }

  const pack = CREDIT_PACKS.find((p) => p.id === parsed.packId);
  if (!pack) return fail("Unknown credit pack", 400);

  const priceId = getCreditPackPriceId(parsed.packId);
  if (!priceId) return fail("Credit pack price not configured", 500);

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
    mode: "payment",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/settings/billing?credits=1`,
    cancel_url: `${origin}/settings/billing?canceled=1`,
    metadata: {
      orgId: user.orgId,
      kind: "credits",
      packId: pack.id,
      credits: String(pack.credits),
    },
  });

  return ok({ url: session.url });
}
