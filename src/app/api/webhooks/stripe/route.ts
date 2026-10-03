import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { Prisma } from "@prisma/client";
import { failFromError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe/client";
import {
  applyCreditPurchase,
  getSubscription,
  recordInvoice,
  setSubscription,
  type Subscription,
} from "@/lib/billing/repository";
import { auditLog } from "@/lib/audit/log";
import type { PlanId } from "@/lib/billing/plans";
import { sendEmail } from "@/lib/email";
import { paymentConfirmedTemplate } from "@/lib/email/templates/payment-confirmed";
import { paymentActionRequiredTemplate } from "@/lib/email/templates/payment-action-required";
import { trialEndingTemplate } from "@/lib/email/templates/trial-ending";
import { trialDeniedTemplate } from "@/lib/email/templates/trial-denied";
import { getTranslations } from "next-intl/server";
import { PLANS } from "@/lib/billing/plans";
import { COMPANY } from "@/lib/company";
import { formatEuro, planAmountCents } from "@/lib/billing/trial-rule";
import { siteUrl } from "@/lib/auth/tokens";
import { APP_TIME_ZONE } from "@/lib/timezone";
import { applyTrialStart } from "@/lib/billing/trial-start";

export const runtime = "nodejs";

/**
 * The product's status for a Stripe subscription status — the ONE mapping, used
 * both when a checkout completes and when Stripe reports a change.
 * null for "incomplete" / "incomplete_expired": a first payment that has not
 * gone through (see handleSubscriptionUpdated), which records no subscription.
 *
 * EVERY Stripe status is mapped explicitly (founder's rule: access follows
 * payment). None of the ones below grants full access (only "active" and
 * "trialing" do — requireActiveAccess):
 *   • unpaid — the retries are over and invoices stay open; Stripe's own
 *     advice is to revoke access. paused — a Stripe-side trial ended with no
 *     payment method; it resumes once one is added. Both → "past_due": no
 *     access, but the subscription exists and paying (or adding a card) in the
 *     Stripe portal brings it back to "active" — the billing page offers the
 *     portal for "past_due", not a new checkout.
 *   • anything Stripe may add later → "past_due" too (fail closed).
 */
function statusFromStripe(stripeStatus: Stripe.Subscription.Status, orgId: string): Subscription["status"] | null {
  switch (stripeStatus) {
    case "incomplete":
    case "incomplete_expired":
      return null;
    case "active":
    case "trialing":
    case "past_due":
    case "canceled":
      return stripeStatus;
    case "unpaid":
    case "paused":
      return "past_due";
    default:
      console.warn(`[stripe-webhook] unknown subscription status "${stripeStatus}" for org ${orgId} — recorded as past_due`);
      return "past_due";
  }
}

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

  // checkout.session.completed carries neither the subscription's STATUS nor
  // its billing period, so the subscription is read from Stripe. Until
  // 2026-10-03 the status was forced to "active" here — wrong as soon as a
  // checkout can start a TRIAL ("trialing") or a payment still needs the
  // customer ("incomplete"). The retrieve is no longer best effort: without it
  // the status is unknown, so the event fails and Stripe retries it (every
  // write below is safe to repeat).
  // The same retrieve also expands the payment method, for the card
  // fingerprint the register of trials keeps (@/lib/billing/trial-claims).
  if (!subscriptionId) {
    console.warn(`[stripe-webhook] checkout ${session.id} for org ${orgId} has no subscription: nothing recorded`);
    return;
  }
  const fresh = await getStripe().subscriptions.retrieve(subscriptionId, { expand: ["default_payment_method"] });
  const status = statusFromStripe(fresh.status, orgId);
  if (!status) {
    // The first payment has not gone through: the subscription is recorded when
    // Stripe reports it as paid (customer.subscription.updated).
    console.warn(`[stripe-webhook] checkout for org ${orgId}: subscription ${subscriptionId} is ${fresh.status}, not recorded yet`);
    return;
  }

  await setSubscription({
    ...existing,
    plan,
    cycle,
    status,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    currentPeriodEnd: fresh.current_period_end ? new Date(fresh.current_period_end * 1000) : existing.currentPeriodEnd,
    cancelAtPeriodEnd: fresh.cancel_at_period_end ?? false,
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

  // A trial that Stripe started: only now is the card known. Either it is
  // recorded and the trial credits are given, or — the card (or the VAT
  // number) has already had a trial — the trial is ended at once and Stripe
  // charges the first period (src/lib/billing/trial-start.ts). Not best
  // effort: if this fails the event fails and Stripe retries it; a retry of a
  // trial already recorded changes nothing.
  if (fresh.status === "trialing") {
    const trial = await applyTrialStart({ organizationId: orgId, subscription: fresh });
    if (trial.outcome === "denied") {
      await sendTrialDeniedEmail(orgId, trial.subscription, trial.reason);
      const status = statusFromStripe(trial.subscription.status, orgId);
      if (status) {
        await setSubscription({
          ...(await getSubscription(orgId)),
          status,
          currentPeriodEnd: trial.subscription.current_period_end
            ? new Date(trial.subscription.current_period_end * 1000)
            : null,
        });
      }
    }
  }
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  const orgId = (sub.metadata?.orgId as string) ?? null;
  if (!orgId) return;

  const plan = planFromMetadata(sub.metadata as Record<string, string>);
  const existing = await getSubscription(orgId);

  // Status mapping: statusFromStripe (until 2026-09-27 four statuses fell
  // through to `existing.status`, so an "unpaid" subscription could stay
  // "active" for good). incomplete — the FIRST payment has not gone through
  // yet (Stripe gives ~23 hours); incomplete_expired — it never did, and Stripe
  // voided the invoice (terminal). Nothing was ever paid: handled here as "no
  // subscription".
  const status = statusFromStripe(sub.status, orgId);
  if (!status) {
    // A first payment that did not (yet) go through. Recorded as "no
    // subscription": no Stripe id, status "canceled" — which getSubscription
    // reads through the trial window (repository.ts), so an org still in its
    // trial keeps its trial and nothing more, and the plan it tried to buy is
    // NOT applied. When the payment succeeds Stripe sends "active" and the
    // branch below records the subscription.
    // Applied ONLY when the row records no Stripe subscription: a subscription
    // never goes back to "incomplete" once paid, so for a row that already has
    // one this event is either older than the one that activated it (Stripe
    // does not guarantee order) or about a second attempt — neither may take
    // away a paying customer's access.
    if (existing.stripeSubscriptionId) {
      console.warn(
        `[stripe-webhook] ${sub.status} for ${sub.id} ignored: org ${orgId} already records subscription ${existing.stripeSubscriptionId} (${existing.status})`,
      );
      return;
    }
    await setSubscription({ ...existing, status: "canceled", stripeSubscriptionId: null, cancelAtPeriodEnd: false });
    return;
  }

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
        // No locale on the Stripe customer object at all, and the billing
        // email is not guaranteed to match any User.email (an accounts-payable
        // address, say) — so it is looked up via the ORGANIZATION instead,
        // which this webhook already resolves reliably from its own metadata.
        // Billing is owner-only (requireOwnerRole, src/lib/auth/require-role.ts),
        // so the owner's own language is the right one to ask.
        const ownerMembership = await prisma.membership.findFirst({
          where: { organizationId: orgId, role: "owner" },
          select: { user: { select: { locale: true } } },
        });
        const locale = ownerMembership?.user?.locale === "en" ? "en" : "it";
        const dateLocale = locale === "en" ? "en-US" : "it-IT";

        // sendEmail never throws (it catches internally and returns
        // {success,error} — see send.ts): a Resend failure here would resolve
        // normally, not land in the catch below, so it needs its own check to
        // leave a trace. The catch below still matters — it protects against
        // getStripe()/customers.retrieve() throwing above — but was never what
        // stood between an email failure and this webhook's response.
        const sendResult = await sendEmail({
          to: email,
          subject: locale === "en" ? "Payment confirmed — Anlyra" : "Pagamento confermato — Anlyra",
          html: paymentConfirmedTemplate({
            userName: (customer as Stripe.Customer).name || (locale === "en" ? "Customer" : "Cliente"),
            userEmail: email,
            planName: invoice.lines.data[0]?.description || "Anlyra Pro",
            amount: (invoice.amount_paid / 100).toFixed(2),
            currency: invoice.currency.toUpperCase(),
            nextBillingDate: new Date(invoice.period_end * 1000).toLocaleDateString(dateLocale, {
              timeZone: APP_TIME_ZONE,
            }),
            invoiceUrl: invoice.hosted_invoice_url || "",
            manageUrl: `${siteUrl()}/${locale}/settings/billing`,
            locale,
          }),
        });
        if (!sendResult.success) {
          console.error('[email] payment-confirmed failed', { to: email, reason: sendResult.error });
        }
      }
    }
  } catch (e) {
    console.error("[stripe-webhook] payment-confirmed email failed", e);
    // Intentionally not re-throwing — email failure must not break the webhook response
  }
}

/** The organization an invoice belongs to, from its own or its subscription's metadata. */
function orgIdOfInvoice(invoice: Stripe.Invoice): string | null {
  return (
    (invoice.metadata?.orgId as string | undefined) ??
    ((invoice as unknown as { subscription_details?: { metadata?: Record<string, string> } })
      .subscription_details?.metadata?.orgId as string | undefined) ??
    null
  );
}

/** The owner of an organization, who is the one who can pay (requireOwnerRole). */
async function ownerOf(orgId: string) {
  const m = await prisma.membership.findFirst({
    where: { organizationId: orgId, role: "owner" },
    orderBy: { joinedAt: "asc" },
    select: { user: { select: { email: true, name: true, locale: true } } },
  });
  if (!m?.user?.email) return null;
  return { email: m.user.email, name: m.user.name, locale: (m.user.locale === "en" ? "en" : "it") as "it" | "en" };
}

/**
 * A payment that needs the customer (3D Secure) — typically the first charge
 * at the END OF A TRIAL, made while the customer is not on the site. Stripe
 * keeps the invoice open and moves the subscription to past_due/incomplete
 * (customer.subscription.updated takes care of access); what is missing is
 * telling the customer, with the link where they can confirm the payment.
 */
async function handlePaymentActionRequired(invoice: Stripe.Invoice) {
  const orgId = orgIdOfInvoice(invoice);
  if (!orgId) return;
  const owner = await ownerOf(orgId);
  if (!owner || !invoice.hosted_invoice_url) {
    console.warn(`[stripe-webhook] payment action required for org ${orgId}: no owner email or no invoice link, nobody told`);
    return;
  }
  const amount = (invoice.amount_due / 100).toLocaleString(owner.locale === "en" ? "en-US" : "it-IT", { minimumFractionDigits: 2 });
  const result = await sendEmail({
    to: owner.email,
    subject: owner.locale === "en" ? "Confirm your payment — Anlyra" : "Conferma il pagamento — Anlyra",
    html: paymentActionRequiredTemplate({
      userName: owner.name || (owner.locale === "en" ? "Customer" : "Cliente"),
      userEmail: owner.email,
      amount: `${amount} ${invoice.currency.toUpperCase()}`,
      confirmUrl: invoice.hosted_invoice_url,
      locale: owner.locale,
    }),
  });
  if (!result.success) console.error("[email] payment-action-required failed", { to: owner.email, reason: result.error });
}

/** "Pro" / "Avanzato" / … in the owner's language. */
async function planLabel(plan: PlanId, locale: "it" | "en"): Promise<string> {
  const t = await getTranslations({ locale });
  return t(PLANS[plan].nameKey as "billing.plans.pro.name");
}

/** The plan and cycle a Stripe subscription was bought for (its metadata), PRO/monthly when absent. */
function planOfSubscription(sub: Stripe.Subscription): { plan: PlanId; cycle: "monthly" | "yearly" } {
  return {
    plan: planFromMetadata(sub.metadata as Record<string, string>) ?? "PRO",
    cycle: sub.metadata?.cycle === "yearly" ? "yearly" : "monthly",
  };
}

/**
 * Stripe announces the end of a trial (3 days before, by default — founder's
 * decision: an email 3 days before the end, with the date and the amount). The
 * amount is the one Stripe will actually charge (the upcoming invoice); the
 * plan's list price only if that cannot be read. Best effort: an email that
 * cannot be sent is logged, never fails the webhook.
 */
async function handleTrialWillEnd(sub: Stripe.Subscription) {
  const orgId = (sub.metadata?.orgId as string) ?? null;
  if (!orgId || !sub.trial_end) return;
  try {
    const owner = await ownerOf(orgId);
    if (!owner) {
      console.warn(`[stripe-webhook] trial of org ${orgId} ends soon: no owner email, nobody told`);
      return;
    }
    const { plan, cycle } = planOfSubscription(sub);
    let amountCents = planAmountCents(plan, cycle);
    try {
      const upcoming = await getStripe().invoices.retrieveUpcoming({ subscription: sub.id });
      amountCents = upcoming.amount_due;
    } catch (e) {
      console.warn(`[stripe-webhook] upcoming invoice for ${sub.id} not readable, list price used:`, e);
    }
    const endDate = new Date(sub.trial_end * 1000).toLocaleDateString(owner.locale === "en" ? "en-GB" : "it-IT", {
      timeZone: APP_TIME_ZONE,
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const result = await sendEmail({
      to: owner.email,
      subject:
        owner.locale === "en" ? `Your free trial ends on ${endDate} — Anlyra` : `La prova gratuita finisce il ${endDate} — Anlyra`,
      html: trialEndingTemplate({
        userName: owner.name || (owner.locale === "en" ? "Customer" : "Cliente"),
        userEmail: owner.email,
        planName: await planLabel(plan, owner.locale),
        endDate,
        amount: formatEuro(amountCents, owner.locale),
        manageUrl: `${siteUrl()}/${owner.locale}/settings/subscription`,
        locale: owner.locale,
      }),
    });
    if (!result.success) console.error("[email] trial-ending failed", { to: owner.email, reason: result.error });
  } catch (e) {
    console.error(`[stripe-webhook] trial-ending email for org ${orgId} failed:`, e);
  }
}

/**
 * The trial did not start (the card, or the VAT number, had already had one)
 * and the first period was charged at once: the customer is told by email, as
 * well as on screen. Replies go to the founder: whoever thinks it is a mistake
 * can ask for a person to review it (art. 22 GDPR). Best effort.
 */
async function sendTrialDeniedEmail(orgId: string, sub: Stripe.Subscription, reason: "card" | "vat" | "company") {
  try {
    const owner = await ownerOf(orgId);
    if (!owner) {
      console.warn(`[stripe-webhook] trial denied for org ${orgId}: no owner email, nobody told`);
      return;
    }
    const { plan, cycle } = planOfSubscription(sub);
    let amountCents = planAmountCents(plan, cycle);
    try {
      const inv =
        typeof sub.latest_invoice === "string" ? await getStripe().invoices.retrieve(sub.latest_invoice) : sub.latest_invoice;
      if (inv) amountCents = inv.amount_due;
    } catch (e) {
      console.warn(`[stripe-webhook] invoice of ${sub.id} not readable, list price used:`, e);
    }
    const result = await sendEmail({
      to: owner.email,
      replyTo: COMPANY.contactEmail,
      subject: owner.locale === "en" ? "Your subscription started without a trial — Anlyra" : "Abbonamento partito senza prova — Anlyra",
      html: trialDeniedTemplate({
        userName: owner.name || (owner.locale === "en" ? "Customer" : "Cliente"),
        userEmail: owner.email,
        planName: await planLabel(plan, owner.locale),
        amount: formatEuro(amountCents, owner.locale),
        reason,
        manageUrl: `${siteUrl()}/${owner.locale}/settings/subscription`,
        locale: owner.locale,
      }),
    });
    if (!result.success) console.error("[email] trial-denied failed", { to: owner.email, reason: result.error });
  } catch (e) {
    console.error(`[stripe-webhook] trial-denied email for org ${orgId} failed:`, e);
  }
}

/**
 * The organization of an invoice when its own metadata does not say: Stripe
 * puts the subscription's metadata on the invoice only as subscription_details,
 * and a renewal or end-of-trial invoice carries no metadata of its own. Then
 * the subscription id, and last the customer id, are looked up in our
 * BillingSubscription rows — the same ids the checkout and subscription
 * events recorded. null when none of them is ours.
 */
async function resolveInvoiceOrgId(invoice: Stripe.Invoice): Promise<string | null> {
  const direct = orgIdOfInvoice(invoice);
  if (direct) return direct;
  const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id ?? null;
  if (subscriptionId) {
    const row = await prisma.billingSubscription.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
      select: { organizationId: true },
    });
    if (row) return row.organizationId;
  }
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? null;
  if (customerId) {
    const row = await prisma.billingSubscription.findFirst({
      where: { stripeCustomerId: customerId },
      select: { organizationId: true },
    });
    if (row) return row.organizationId;
  }
  return null;
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Until 2026-10-03 only invoice.metadata was read, which a subscription
  // invoice does not carry: a failed renewal changed nothing here.
  const orgId = await resolveInvoiceOrgId(invoice);
  if (!orgId) {
    console.warn(`[stripe-webhook] payment failed for invoice ${invoice.id}: no organization found`);
    return;
  }
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
    // A deliberate, expected rejection (wrong/rotated secret, replay, a
    // malformed payload) — not routed through failFromError, which is for
    // the unexpected case below. Was interpolating (err as Error).message
    // into the response; Stripe's own SDK text for this can describe the
    // computed vs expected signature, so it stays in the log only.
    console.error("[stripe-webhook] signature verification failed:", err);
    return NextResponse.json({ error: "WEBHOOK_SIGNATURE_INVALID" }, { status: 400 });
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
      case "invoice.payment_action_required":
        await handlePaymentActionRequired(event.data.object as Stripe.Invoice);
        break;
      case "customer.subscription.trial_will_end":
        await handleTrialWillEnd(event.data.object as Stripe.Subscription);
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
    // Was returning (err as Error).message. Logged here — nowhere above logs
    // THIS error, only a failed release of the idempotency claim — then
    // failFromError answers with a fixed 500 instead of the raw text.
    console.error("[stripe-webhook] event processing failed:", err);
    return failFromError(err);
  }

  return NextResponse.json({ received: true });
}
