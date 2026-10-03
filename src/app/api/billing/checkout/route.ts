import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api/response";
import { getAuthContext } from "@/lib/session";
import { requireWritableOrg } from '@/lib/auth/require-writable';
import { requireOwnerRole } from '@/lib/auth/require-role';
import { getStripe } from "@/lib/stripe/client";
import { getStripePriceId } from "@/lib/stripe/prices";
import { getSubscription, setSubscription } from "@/lib/billing/repository";
import { prisma } from "@/lib/prisma";
import { BILLING_SELECT, checkStoredBillingDetails } from "@/lib/billing/billing-details";
import { syncStripeCustomerBilling } from "@/lib/billing/stripe-customer";
import { recordTrialClaimAttempt } from "@/lib/billing/trial-claims";
import { trialEligibility } from "@/lib/billing/trial-eligibility";
import { TRIAL_DAYS, planAmountCents, recordTrialRuleAcceptance, trialRuleText } from "@/lib/billing/trial-rule";
import { getClientIp } from "@/lib/rate-limit";

const Body = z.object({
  plan: z.enum(["PRO", "ADVANCED", "ENTERPRISE"]),
  cycle: z.enum(["monthly", "yearly"]),
  // The box ticked BEFORE entering the card (founder's decision): the rule of
  // the trial and the exact amount of the plan. Without it, no checkout.
  acceptTrialRule: z.literal(true).optional(),
  // Whether the page showed the version WITH the trial: if the answer has
  // changed since (another trial started meanwhile), the customer accepted a
  // text that no longer applies and must see the new one.
  trialOffered: z.boolean().optional(),
  locale: z.enum(["it", "en"]).optional(),
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

  // Founder's decision: no payment before the owner has entered the data
  // needed for the electronic invoice. Re-checked here on every checkout, not
  // only by the disabled buttons (see @/lib/billing/billing-details).
  const billingOrg = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: BILLING_SELECT,
  });
  const billing = billingOrg ? checkStoredBillingDetails(billingOrg) : null;
  if (!billing?.ok) return fail("BILLING_DETAILS_INCOMPLETE", 400);

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

  // ── The trial and the box ──
  // Who may have a trial: src/lib/billing/trial-eligibility.ts (before the
  // payment the card is not known yet; it is checked when the checkout
  // completes). The rule the customer ticked is recorded with the exact text
  // and amount, built by the same function the page used to show it.
  if (parsed.acceptTrialRule !== true) return fail("TRIAL_RULE_NOT_ACCEPTED", 400);
  const eligibility = await trialEligibility({
    organizationId: ctx.organizationId,
    vatNumber: billing.data.vatNumber,
  });
  const trialOffered = eligibility.eligible;
  if (parsed.trialOffered !== undefined && parsed.trialOffered !== trialOffered) {
    return fail("TRIAL_OFFER_CHANGED", 409);
  }
  const user = await prisma.user.findUnique({ where: { id: ctx.userId }, select: { locale: true } });
  const locale = parsed.locale ?? (user?.locale === "en" ? "en" : "it");
  const amountCents = planAmountCents(parsed.plan, parsed.cycle);
  try {
    await recordTrialRuleAcceptance({
      req,
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      text: await trialRuleText({ locale, plan: parsed.plan, cycle: parsed.cycle, trialOffered }),
      amountCents,
      plan: parsed.plan,
      cycle: parsed.cycle,
      locale,
      trialOffered,
    });
  } catch (e) {
    // No record of what the customer accepted → no payment.
    console.error("[billing/checkout] trial rule acceptance NOT recorded:", e);
    return fail("TRIAL_RULE_NOT_RECORDED", 500);
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
      // Saves the customer id for the next checkout — and NOT the synthetic
      // trial status getSubscription() derives from Organization.trialEndsAt:
      // written here, "trialing" used to outlive the trial for good (free
      // access forever by opening this page and leaving). Without a Stripe
      // subscription the row says "canceled" (= no subscription), and
      // getSubscription() keeps deriving the trial from trialEndsAt, so an org
      // still in its trial keeps its trial. Nothing else changes: the Stripe
      // calls below and the webhook that activates the subscription are the same.
      await setSubscription({
        ...sub,
        status: !sub.stripeSubscriptionId && sub.status === "trialing" ? "canceled" : sub.status,
        stripeCustomerId: customerId,
      });
    }

    // Legal name, address and VAT number onto the Stripe customer, for its
    // receipts — every checkout, so a change of details is carried over too.
    await syncStripeCustomerBilling(stripe, customerId, billing.data);

    // Prefer a fixed, trusted base URL over the client-supplied Origin header for
    // the Stripe redirect targets (avoids relying on an attacker-controllable header).
    const origin = (
      process.env.NEXT_PUBLIC_SITE_URL ?? req.headers.get("origin") ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000"
    ).trim();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      // The card is always asked for, with or without a trial: nobody uses
      // Anlyra without one (founder's decision).
      payment_method_collection: "always",
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
        // A 7-day trial run by Stripe, only for whoever may have one. If the
        // payment method is missing when it ends, the subscription is closed
        // rather than left unpaid.
        ...(trialOffered
          ? {
              trial_period_days: TRIAL_DAYS,
              trial_settings: { end_behavior: { missing_payment_method: "cancel" as const } },
            }
          : {}),
      },
    });

    // The register of trials (@/lib/billing/trial-claims): the attempt, with
    // the VAT number and the IP of this request. Best effort — it never fails
    // the checkout. The card fingerprint arrives with checkout.session.completed.
    await recordTrialClaimAttempt({
      organizationId: ctx.organizationId,
      vatNumber: billing.data.vatNumber,
      ip: getClientIp(req),
    });

    return ok({ url: session.url });
  } catch (e) {
    console.error("[billing/checkout] Stripe call failed:", e);
    return fail("PAYMENT_PROVIDER_UNAVAILABLE", 500);
  }
}
