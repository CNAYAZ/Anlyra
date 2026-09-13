import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api/response";
import { getAuthContext } from "@/lib/session";
import { requireWritableOrg } from '@/lib/auth/require-writable';
import { requireOwnerRole } from '@/lib/auth/require-role';
import { getStripe } from "@/lib/stripe/client";
import { getCreditPackPriceId } from "@/lib/stripe/prices";
import { CREDIT_PACKS } from "@/lib/billing/plans";
import { getSubscription, setSubscription } from "@/lib/billing/repository";

const Body = z.object({
  packId: z.enum(["credits_50", "credits_200", "credits_500"]),
});

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return fail("Unauthenticated", 401);
  // Demo organization: read-only. See requireWritableOrg.
  const readOnly = requireWritableOrg(ctx.organizationId);
  if (readOnly) return readOnly;
  // Billing is owner-only: this spends the organization's money. See requireOwnerRole.
  const denied = requireOwnerRole(ctx);
  if (denied) return denied;

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

    const origin = (req.headers.get("origin") ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000").trim();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/settings/billing?credits=1`,
      cancel_url: `${origin}/settings/billing?canceled=1`,
      metadata: {
        orgId: ctx.organizationId,
        kind: "credits",
        packId: pack.id,
        credits: String(pack.credits),
      },
    });

    return ok({ url: session.url });
  } catch (e) {
    console.error("[billing/credits/checkout] Stripe call failed:", e);
    return fail("PAYMENT_PROVIDER_UNAVAILABLE", 500);
  }
}
