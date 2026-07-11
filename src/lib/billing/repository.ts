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

// Default returned for an org with no BillingSubscription row yet — same shape
// the in-memory stub used to synthesize, so callers (server-gate, billing/state,
// webhook) see identical behaviour. NOT persisted: an org only gets a row once a
// real subscription/checkout writes one via setSubscription.
function defaultSubscription(orgId: string): Subscription {
  return {
    orgId,
    plan: (process.env.DEV_DEFAULT_PLAN as PlanId) ?? "PRO",
    status: "active",
    cycle: "monthly",
    stripeSubscriptionId: null,
    stripeCustomerId: null,
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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

export async function addCreditEntry(entry: CreditEntry): Promise<void> {
  // Persists the ledger row only, mirroring the stub (which did NOT touch the
  // balance). The usable balance stays on Organization.aiCredits, consumed
  // atomically by @/lib/credits. See STEP-2 report: wiring a purchase to also
  // increment aiCredits is a deliberate follow-up decision, not replicated here.
  await prisma.creditEntry.create({
    data: {
      organizationId: entry.orgId,
      delta: entry.delta,
      reason: entry.reason,
    },
  });
}

export async function getBillingState(orgId: string): Promise<BillingState> {
  const sub = await getSubscription(orgId);
  return {
    plan: sub.plan,
    status: sub.status,
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
