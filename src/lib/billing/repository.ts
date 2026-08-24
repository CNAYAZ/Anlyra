import { prisma } from "@/lib/prisma";
import type { PlanId } from "./plans";
import type { BillingState } from "./context";

export interface Subscription {
  orgId: string;
  plan: PlanId;
  status: "active" | "trialing" | "past_due" | "canceled";
  cycle: "monthly" | "yearly";
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

export interface Invoice {
  id: string;
  orgId: string;
  number: string;
  amountCents: number;
  currency: string;
  status: "paid" | "open" | "void" | "uncollectible";
  periodEnd: Date;
  hostedUrl: string | null;
  pdfUrl: string | null;
}

export interface CreditEntry {
  id: string;
  orgId: string;
  delta: number;
  reason: "monthly_grant" | "purchase" | "ai_call" | "refund";
  createdAt: Date;
}

// Derived (NOT persisted) billing state for an org that has no BillingSubscription
// row yet. The old placeholder faked an "active PRO" for 30 days (driven by the
// leftover DEV_DEFAULT_PLAN), which granted PRO to every org forever. Instead we
// read the org's REAL trial window from the DB:
//   • trial still running  → PRO on "trialing", ending at the real trialEndsAt
//   • trial expired/absent → "canceled" (no active subscription)
// The plan stays "PRO" even when expired because it must be a valid PlanId (PLANS
// lookups in server-gate/context would crash on an unknown id like the schema's
// "STARTER" default); it is the lowest tier. It is the STATUS that marks the org
// inactive, never a fabricated active plan. NOTE (see report): feature gating is
// currently plan-only, so status "canceled" alone does not yet lock features —
// hard-blocking expired trials needs a separate, agreed change.
async function defaultSubscription(orgId: string): Promise<Subscription> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { trialEndsAt: true },
  });
  const trialEndsAt = org?.trialEndsAt ?? null;
  const trialActive = trialEndsAt !== null && trialEndsAt.getTime() > Date.now();

  return {
    orgId,
    plan: "PRO",
    status: trialActive ? "trialing" : "canceled",
    cycle: "monthly",
    stripeSubscriptionId: null,
    stripeCustomerId: null,
    currentPeriodEnd: trialEndsAt, // real trial end (future=trialing, past=expired), or null
    cancelAtPeriodEnd: false,
  };
}

export async function getSubscription(orgId: string): Promise<Subscription> {
  const row = await prisma.billingSubscription.findUnique({
    where: { organizationId: orgId },
  });
  if (!row) return defaultSubscription(orgId);
  return {
    orgId: row.organizationId,
    plan: row.plan as PlanId,
    status: row.status as Subscription["status"],
    cycle: row.cycle as Subscription["cycle"],
    stripeSubscriptionId: row.stripeSubscriptionId,
    stripeCustomerId: row.stripeCustomerId,
    currentPeriodEnd: row.currentPeriodEnd,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
  };
}

export async function setSubscription(sub: Subscription): Promise<void> {
  const data = {
    plan: sub.plan,
    status: sub.status,
    cycle: sub.cycle,
    stripeCustomerId: sub.stripeCustomerId,
    stripeSubscriptionId: sub.stripeSubscriptionId,
    currentPeriodEnd: sub.currentPeriodEnd,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
  };
  await prisma.billingSubscription.upsert({
    where: { organizationId: sub.orgId },
    create: { organizationId: sub.orgId, ...data },
    update: data,
  });
}

export async function listInvoices(orgId: string): Promise<Invoice[]> {
  const rows = await prisma.billingInvoice.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.stripeInvoiceId,
    orgId: r.organizationId,
    number: r.number ?? r.stripeInvoiceId,
    amountCents: r.amountCents,
    currency: r.currency,
    status: r.status as Invoice["status"],
    periodEnd: r.periodEnd ?? r.createdAt,
    hostedUrl: r.hostedUrl,
    pdfUrl: r.pdfUrl,
  }));
}

export async function recordInvoice(inv: Invoice): Promise<void> {
  // Idempotent on Stripe webhook replays via the unique stripeInvoiceId. inv.id
  // is the Stripe invoice id (that's what the webhook passes).
  const data = {
    organizationId: inv.orgId,
    number: inv.number,
    amountCents: inv.amountCents,
    currency: inv.currency,
    status: inv.status,
    periodEnd: inv.periodEnd,
    hostedUrl: inv.hostedUrl,
    pdfUrl: inv.pdfUrl,
  };
  await prisma.billingInvoice.upsert({
    where: { stripeInvoiceId: inv.id },
    create: { stripeInvoiceId: inv.id, ...data },
    update: data,
  });
}

export async function getCreditBalance(orgId: string): Promise<number> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { aiCredits: true },
  });
  return org?.aiCredits ?? 0;
}

export async function listCreditEntries(orgId: string): Promise<CreditEntry[]> {
  const rows = await prisma.creditEntry.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    orgId: r.organizationId,
    delta: r.delta,
    reason: r.reason as CreditEntry["reason"],
    createdAt: r.createdAt,
  }));
}

/**
 * Applies a PAID credit pack: increments the usable balance AND records the
 * ledger row, atomically.
 *
 * Replaces the previous ledger-only addCreditEntry(), which wrote a CreditEntry
 * and nothing else. Because consumeCredits (src/lib/credits.ts) reads exclusively
 * from Organization.aiCredits, that meant a customer could complete a Stripe
 * payment and receive nothing usable — the purchase showed in the history while
 * the balance stayed put.
 *
 * ── ATOMIC ──
 * Both writes are in one transaction: a balance credited without a ledger row
 * would be money we cannot account for, and a ledger row without the balance is
 * exactly the bug being fixed here. `increment` (not `set`) because a purchase
 * ADDS to whatever the org has — unlike the monthly renewal, which resets.
 *
 * ── NOT CREDITED TWICE ──
 * This function is deliberately NOT idempotent by itself; it leans on the
 * webhook's event-level guard (see POST in api/webhooks/stripe/route.ts), which
 * claims event.id in a UNIQUE insert BEFORE any processing and only releases the
 * claim if processing threw. A Stripe retry of an already-applied event therefore
 * loses the insert race with P2002 and returns 200 without ever reaching this
 * function. That claim is the single chokepoint for every handler in the webhook,
 * which is why the guard belongs there and is not duplicated per-handler.
 */
export async function applyCreditPurchase(params: {
  orgId: string;
  credits: number;
}): Promise<void> {
  if (params.credits <= 0) return;

  await prisma.$transaction([
    prisma.organization.update({
      where: { id: params.orgId },
      data: { aiCredits: { increment: params.credits } },
    }),
    prisma.creditEntry.create({
      data: {
        organizationId: params.orgId,
        delta: params.credits,
        reason: "purchase",
      },
    }),
  ]);
}

export async function getBillingState(orgId: string): Promise<BillingState> {
  const sub = await getSubscription(orgId);
  return {
    plan: sub.plan,
    status: sub.status,
    cycle: sub.cycle,
    periodEnd: sub.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : null,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
  };
}

export async function getMonthlyUsage(orgId: string) {
  // Placeholder; in real app reads from imports / ai_calls / users / dashboards tables.
  void orgId;
  return {
    imports: 0,
    aiCredits: 0,
    users: 1,
    customDashboards: 0,
  };
}
