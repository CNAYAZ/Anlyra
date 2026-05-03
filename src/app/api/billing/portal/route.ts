import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/session";
import { getStripe } from "@/lib/stripe/client";
import { getSubscription } from "@/lib/billing/repository";

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return fail("Unauthenticated", 401);
  }

  const sub = await getSubscription(user.orgId);
  if (!sub.stripeCustomerId) return fail("No Stripe customer for this organization", 400);

  const origin = req.headers.get("origin") ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const stripe = getStripe();
  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${origin}/settings/billing`,
  });

  return ok({ url: portal.url });
}
