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

// In-memory stub. Wire to Prisma in the real app — same shape, swap the impl.
const subscriptions = new Map<string, Subscription>();
const invoices = new Map<string, Invoice[]>();
const creditEntries = new Map<string, CreditEntry[]>();

function ensureDefaults(orgId: string): Subscription {
  let sub = subscriptions.get(orgId);
  if (!sub) {
    sub = {
      orgId,
      plan: (process.env.DEV_DEFAULT_PLAN as PlanId) ?? "PRO",
      status: "active",
      cycle: "monthly",
      stripeSubscriptionId: null,
      stripeCustomerId: null,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
    };
    subscriptions.set(orgId, sub);
  }
  return sub;
}

export async function getSubscription(orgId: string): Promise<Subscription> {
  return ensureDefaults(orgId);
}

export async function setSubscription(sub: Subscription): Promise<void> {
  subscriptions.set(sub.orgId, sub);
}

export async function listInvoices(orgId: string): Promise<Invoice[]> {
  return invoices.get(orgId) ?? [];
}

export async function recordInvoice(inv: Invoice): Promise<void> {
  const list = invoices.get(inv.orgId) ?? [];
  list.unshift(inv);
  invoices.set(inv.orgId, list);
}

export async function getCreditBalance(orgId: string): Promise<number> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { aiCredits: true },
  });
  return org?.aiCredits ?? 0;
}

export async function listCreditEntries(orgId: string): Promise<CreditEntry[]> {
  return creditEntries.get(orgId) ?? [];
}

export async function addCreditEntry(entry: CreditEntry): Promise<void> {
  const list = creditEntries.get(entry.orgId) ?? [];
  list.unshift(entry);
  creditEntries.set(entry.orgId, list);
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
