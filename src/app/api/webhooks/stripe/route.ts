import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import {
  addCreditEntry,
  getSubscription,
  recordInvoice,
  setSubscription,
} from "@/lib/billing/repository";
import type { PlanId } from "@/lib/billing/plans";
import { sendEmail } from "@/lib/email";
import { paymentConfirmedTemplate } from "@/lib/email/templates/payment-confirmed";

export const runtime = "nodejs";

function planFromMetadata(meta: Record<string, string> | undefined): PlanId | null {
  const p = meta?.plan;
  if (p === "PRO" || p === "ADVANCED" || p === "ENTERPRISE") return p;
  return null;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const orgId = (session.metadata?.orgId as string) ?? null;
  if (!orgId) return;

  if (session.metadata?.kind === "credits") {
    const credits = Number(session.metadata.credits ?? "0");
    if (credits > 0) {
      await addCreditEntry({
        id: session.id,
        orgId,
        delta: credits,
        reason: "purchase",
        createdAt: new Date(),
      });
    }
    return;
  }

  const plan = planFromMetadata(session.metadata as Record<string, string>);
  const cycle =
    (session.metadata?.cycle as "monthly" | "yearly" | undefined) ?? "monthly";
  if (!plan) return;

  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;

  const existing = await getSubscription(orgId);
  await setSubscription({
    ...existing,
    plan,
    cycle,
    status: "active",
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
  });
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  const orgId = (sub.metadata?.orgId as string) ?? null;
  if (!orgId) return;

  const plan = planFromMetadata(sub.metadata as Record<string, string>);
  const existing = await getSubscription(orgId);

  await setSubscription({
    ...existing,
    plan: plan ?? existing.plan,
    status:
      sub.status === "active"
        ? "active"
        : sub.status === "trialing"
          ? "trialing"
          : sub.status === "past_due"
            ? "past_due"
            : sub.status === "canceled"
              ? "canceled"
              : existing.status,
    stripeSubscriptionId: sub.id,
    currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
    cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
  });
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const orgId = (sub.metadata?.orgId as string) ?? null;
  if (!orgId) return;
  const existing = await getSubscription(orgId);
  await setSubscription({
    ...existing,
    plan: "PRO",
    status: "canceled",
    stripeSubscriptionId: null,
    cancelAtPeriodEnd: false,
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const orgId =
    (invoice.metadata?.orgId as string) ??
    ((invoice as unknown as { subscription_details?: { metadata?: Record<string, string> } })
      .subscription_details?.metadata?.orgId as string | undefined) ??
    null;
  if (!orgId) return;
  await recordInvoice({
    id: invoice.id,
    orgId,
    number: invoice.number ?? invoice.id,
    amountCents: invoice.amount_paid,
    currency: invoice.currency.toUpperCase(),
    status: "paid",
    periodEnd: new Date((invoice.period_end ?? Math.floor(Date.now() / 1000)) * 1000),
    hostedUrl: invoice.hosted_invoice_url ?? null,
    pdfUrl: invoice.invoice_pdf ?? null,
  });

  // Send payment confirmation email — fire-and-forget, never fails the webhook
  try {
    const stripe = getStripe();
    const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
    if (customerId) {
      const customer = await stripe.customers.retrieve(customerId);
      const email = (customer as Stripe.Customer).email;
      if (email) {
        await sendEmail({
          to: email,
          subject: "Pagamento confermato — Anlyra",
          html: paymentConfirmedTemplate({
            userName: (customer as Stripe.Customer).name || "Cliente",
            userEmail: email,
            planName: invoice.lines.data[0]?.description || "Anlyra Pro",
            amount: (invoice.amount_paid / 100).toFixed(2),
            currency: invoice.currency.toUpperCase(),
            nextBillingDate: new Date(invoice.period_end * 1000).toLocaleDateString("it-IT"),
            invoiceUrl: invoice.hosted_invoice_url || "",
          }),
        });
      }
    }
  } catch (e) {
    console.error("[stripe-webhook] payment-confirmed email failed", e);
    // Intentionally not re-throwing — email failure must not break the webhook response
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const orgId = (invoice.metadata?.orgId as string) ?? null;
  if (!orgId) return;
  const existing = await getSubscription(orgId);
  await setSubscription({ ...existing, status: "past_due" });
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: "Missing signature/secret" }, { status: 400 });
  }

  const stripe = getStripe();
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    return NextResponse.json(
      { error: `Webhook signature failed: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        break;
    }
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
