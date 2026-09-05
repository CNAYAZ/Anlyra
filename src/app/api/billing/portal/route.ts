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

  const stripe = getStripe();
  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${origin}/settings/billing`,
  });

  return ok({ url: portal.url });
}
