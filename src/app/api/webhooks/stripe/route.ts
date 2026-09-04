import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe/client";
import {
  applyCreditPurchase,
  getSubscription,
  recordInvoice,
  setSubscription,
} from "@/lib/billing/repository";
import { auditLog } from "@/lib/audit/log";
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
    // Number() on a missing/garbage value yields NaN, which would sail through a
    // ">= 0" style check — guard on Number.isFinite so only a real positive
    // integer ever reaches the balance.
    const credits = Number(session.metadata.credits ?? "0");
    if (!Number.isFinite(credits) || credits <= 0) {
      console.error(
        `[stripe-webhook] credits purchase for org ${orgId} has an invalid credits metadata:`,
        session.metadata.credits,
      );
      return;
    }

    // Credits the PURCHASED balance (Organization.aiCreditsPurchased) and writes
    // the ledger row in one transaction. Before this, only the ledger row was
    // written, so a paying customer got a purchase in their history and no
    // spendable credits. The purchased column — not the plan one — because the
    // monthly renewal overwrites the plan balance and would erase the pack.
    await applyCreditPurchase({ orgId, credits });

    await auditLog({
      action: "credits.purchase",
      organizationId: orgId,
      targetType: "organization",
      targetId: orgId,
      // Non-sensitive: how many credits and which pack. No amount paid, no
      // customer identifiers — see the privacy note in lib/audit/log.ts.
      metadata: { credits, packId: session.metadata.packId ?? null },
    });
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

  // checkout.session.completed does NOT carry the subscription's billing period,
  // so currentPeriodEnd would stay whatever the row had (often null). Retrieve
  // the subscription to populate it. Best-effort: a Stripe error must not fail
  // the webhook — on failure we keep the existing value.
  let currentPeriodEnd = existing.currentPeriodEnd;
  if (subscriptionId) {
    try {
      const fresh = await getStripe().subscriptions.retrieve(subscriptionId);
      if (fresh.current_period_end) {
        currentPeriodEnd = new Date(fresh.current_period_end * 1000);
      }
    } catch (e) {
      console.error("[stripe-webhook] subscription retrieve for period end failed", e);
    }
  }

  await setSubscription({
    ...existing,
    plan,
    cycle,
    status: "active",
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    currentPeriodEnd,
  });

  // The trial-ending email cron (src/lib/cron/trial-check.ts) reads
  // Organization.trialEndsAt, and nothing else in the app ever resets it — so
  // without this, an organization that just subscribed keeps being a candidate
  // for "3 days left in your trial" for the rest of its now-meaningless trial
  // window. updateMany (not update): a garbage/missing orgId should never reach
  // here, but nothing upstream guarantees it, and setSubscription() above
  // already tolerates that case silently — this must not be the one write that
  // throws, fails the whole webhook, and makes Stripe retry an event that will
  // never succeed.
  await prisma.organization.updateMany({
    where: { id: orgId, trialEndsAt: { not: null } },
    data: { trialEndsAt: null },
  });
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  const orgId = (sub.metadata?.orgId as string) ?? null;
  if (!orgId) return;

  const plan = planFromMetadata(sub.metadata as Record<string, string>);
  const existing = await getSubscription(orgId);

  const status =
    sub.status === "active"
      ? "active"
      : sub.status === "trialing"
        ? "trialing"
        : sub.status === "past_due"
          ? "past_due"
          : sub.status === "canceled"
            ? "canceled"
            : existing.status;

  await setSubscription({
    ...existing,
    plan: plan ?? existing.plan,
    status,
    stripeSubscriptionId: sub.id,
    // Populate from the subscription's UNIX timestamp (seconds → ms). Never wipe
    // a previously-good date to null if the field is momentarily absent.
    currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : existing.currentPeriodEnd,
    cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
  });

  // Same reasoning as handleCheckoutCompleted: this event is not only fired at
  // first checkout — it can ALSO be the moment a subscription becomes active
  // again (e.g. a past_due subscription's retried charge finally succeeding).
  // Gated on the resulting status being "active" specifically, so a metadata
  // change on an already-active subscription (trialEndsAt already null) does
  // not needlessly rewrite the row, and neither "trialing", "past_due" nor
  // "canceled" ever touch it here.
  if (status === "active") {
    await prisma.organization.updateMany({
      where: { id: orgId, trialEndsAt: { not: null } },
      data: { trialEndsAt: null },
    });
  }
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

  // ── IDEMPOTENCY ──────────────────────────────────────────────────────────
  // Stripe retries an event when our response is slow, non-2xx, or the
  // connection drops, so the same event.id can arrive more than once. Without
  // this, a retried checkout.session.completed for a credit purchase inserts a
  // SECOND CreditEntry ledger row (addCreditEntry is a plain create), re-runs
  // the plan transition, and re-sends the confirmation email.
  //
  // The claim is an INSERT on a UNIQUE column, so the race between two
  // simultaneous deliveries is settled by the DATABASE (P2002 on the loser),
  // not by a read-then-write check that both concurrent requests could pass.
  //
  // ORDER — claim BEFORE processing, and RELEASE the claim if processing fails:
  //   • Claiming after processing would leave a window where a retry arriving
  //     mid-processing starts a second concurrent run of the same handler.
  //   • Keeping the claim after a failure would mark a never-applied event as
  //     "already seen", so Stripe's retry — the very thing that would fix a
  //     transient database error — would be discarded and the event lost for
  //     good.
  // Claiming first and deleting the claim on failure gives both properties: at
  // most one run at a time, and a failed run stays retryable.
  try {
    await prisma.stripeWebhookEvent.create({
      data: { eventId: event.id, type: event.type },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // Already processed (or being processed right now). Answer 200 so Stripe
      // stops retrying — a duplicate is not an error on their side or ours.
      return NextResponse.json({ received: true, duplicate: true });
    }
    // The idempotency store itself is broken. Fail loudly with 500 so Stripe
    // retries later: processing without the guard risks the double-write this
    // whole block exists to prevent.
    console.error("[stripe-webhook] idempotency claim failed", err);
    return NextResponse.json({ error: "Idempotency store unavailable" }, { status: 500 });
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
    // Release the claim so Stripe's retry can actually re-run this event.
    // Best-effort: if the release fails too, the event stays claimed and will
    // NOT be retried — logged explicitly because that needs a human.
    try {
      await prisma.stripeWebhookEvent.delete({ where: { eventId: event.id } });
    } catch (releaseErr) {
      console.error(
        "[stripe-webhook] FAILED to release idempotency claim for",
        event.id,
        "— this event will not be retried:",
        releaseErr,
      );
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
