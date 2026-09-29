import { z } from 'zod';
import type {
  DemoBudget,
  DemoCashflow,
  DemoCustomerStat,
  DemoDataset,
  DemoInsight,
  DemoSubscription,
  DemoTransaction,
} from '@/lib/demo/data';
import { prisma } from '@/lib/prisma';
import { getCurrentContext } from '@/lib/session';
import { getSubscription } from '@/lib/billing/repository';
import { daysInAppMonth, fromAppWallClock, toAppDateString } from '@/lib/timezone';

export const periodSchema = z.enum(['1m', '3m', '6m', '12m', 'custom']);
export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc');

export const financialQuerySchema = z.object({
  period: periodSchema.default('12m'),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const listQuerySchema = financialQuerySchema.extend({
  category: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['date', 'amount', 'category']).default('date'),
  sortOrder: sortOrderSchema,
});

export type FinancialQuery = z.infer<typeof financialQuerySchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;

export function parseCategory(description: string): { category: string; subcategory: string } {
  const [category, subcategory] = (description ?? '').split('/');
  return {
    category: category?.trim() || 'other',
    subcategory: subcategory?.trim() || '',
  };
}

// "YYYY-MM" of the ITALIAN calendar month `d` falls in. getFullYear()/getMonth()
// read the server's timezone (UTC on Vercel): a movement at 00:30 on 1 October
// in Italy is 22:30 UTC on 30 September and was filed under September.
function monthKey(d: Date): string {
  return toAppDateString(d).slice(0, 7);
}

/**
 * @param organizationIdArg explicit organization to read. Omit it to keep the
 * historical behaviour (resolve from the current session, demo fallback
 * included) — every existing caller does. Callers that must NOT depend on the
 * session, such as the public share route, pass the id explicitly.
 */
export async function getOrgData(organizationIdArg?: string): Promise<DemoDataset> {
  const organizationId = organizationIdArg ?? (await getCurrentContext()).organizationId;
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });

  const records = await prisma.financialRecord.findMany({
    where: { organizationId },
    orderBy: { occurredAt: 'desc' },
  });

  const transactions: DemoTransaction[] = records.map((r) => {
    const { category, subcategory } = parseCategory(r.description ?? '');
    return {
      id: r.id,
      date: r.occurredAt,
      kind: (r.type === 'REVENUE' ? 'REVENUE' : 'COST') as 'REVENUE' | 'COST',
      category,
      subcategory,
      amount: r.amount,
      description: r.description ?? '',
      source: (r.source as DemoTransaction['source']) || 'manual',
    };
  });

  type Monthly = { revenue: number; cost: number };
  const monthlyMap = new Map<string, Monthly>();
  for (const t of transactions) {
    const k = monthKey(t.date);
    const cur = monthlyMap.get(k) ?? { revenue: 0, cost: 0 };
    if (t.kind === 'REVENUE') cur.revenue += t.amount;
    else cur.cost += t.amount;
    monthlyMap.set(k, cur);
  }
  const sortedMonths = Array.from(monthlyMap.keys()).sort();

  // Cashflow: real rows from CashflowEntry (written by the seed). Empty table →
  // honest 1:1 derivation from the monthly transaction totals: INFLOW = revenue,
  // OUTFLOW = costs, no arbitrary multipliers and no invented 'investing' rows.
  const cfRows = await prisma.cashflowEntry.findMany({
    where: { organizationId },
    orderBy: { date: 'asc' },
  });
  let cashflow: DemoCashflow[];
  if (cfRows.length > 0) {
    cashflow = cfRows.map((c) => ({
      id: c.id,
      date: c.date,
      direction: (c.direction === 'INFLOW' ? 'INFLOW' : 'OUTFLOW') as DemoCashflow['direction'],
      category: c.category,
      amount: c.amount,
      description: c.description ?? '',
    }));
  } else {
    cashflow = [];
    for (const period of sortedMonths) {
      const m = monthlyMap.get(period)!;
      const [yyyy, mm] = period.split('-').map(Number);
      // Last millisecond of the month IN ITALY: date-fns' endOfMonth uses the
      // server's timezone and returned 23:59:59.999 UTC, which is 01:59 on the
      // 1st of the NEXT month in Italy.
      const monthEnd = fromAppWallClock({
        year: yyyy,
        month: mm,
        day: daysInAppMonth(yyyy, mm),
        hour: 23,
        minute: 59,
        second: 59,
        ms: 999,
      });
      if (m.revenue > 0) {
        cashflow.push({
          id: `cf_in_${period}`,
          date: monthEnd,
          direction: 'INFLOW',
          category: 'operating',
          amount: Math.round(m.revenue),
          description: 'Derivato dalle transazioni',
        });
      }
      if (m.cost > 0) {
        cashflow.push({
          id: `cf_out_${period}`,
          date: monthEnd,
          direction: 'OUTFLOW',
          category: 'operating',
          amount: Math.round(m.cost),
          description: 'Derivato dalle transazioni',
        });
      }
    }
  }

  // Budget: real rows from BudgetEntry (written by the seed). Empty table → empty
  // list: a planned budget is information only the user has, deriving it would be
  // invention. No more planned = actual × 1.05 and no fixed category weights.
  const budgetRows = await prisma.budgetEntry.findMany({
    where: { organizationId },
    orderBy: { period: 'asc' },
  });
  const budget: DemoBudget[] = budgetRows.map((b) => ({
    id: b.id,
    period: b.period,
    category: b.category,
    planned: b.planned,
    actual: b.actual,
  }));

  // Customers: real rows from CustomerStat (written by seed + data import, and already
  // read by the alerts engine and benchmarks). Empty table → empty list, no invented numbers.
  const statRows = await prisma.customerStat.findMany({
    where: { organizationId },
    orderBy: { period: 'asc' },
  });
  const customers: DemoCustomerStat[] = statRows.map((s) => ({
    period: s.period,
    activeCustomers: s.activeCustomers,
    newCustomers: s.newCustomers,
    churnedCustomers: s.churnedCustomers,
  }));

  // Subscriptions: real rows from Subscription (written by the seed). Empty table →
  // empty list (MRR = 0), no more subscriptions invented from revenue.
  const subRows = await prisma.subscription.findMany({ where: { organizationId } });
  const subscriptions: DemoSubscription[] = subRows.map((s) => ({
    customer: s.customer,
    plan: s.plan,
    mrr: s.mrr,
    startedAt: s.startedAt,
    cancelledAt: s.cancelledAt,
  }));

  const dbInsights = await prisma.insight.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    take: 6,
  });
  const insights: DemoInsight[] = dbInsights.map((i) => ({
    id: i.id,
    title: i.title,
    summary: i.summary,
    impact: i.impact ?? '',
    tone: (i.tone as DemoInsight['tone']) || 'neutral',
  }));

  return {
    organization: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      // The plan the org is ACTUALLY on (BillingSubscription), not
      // Organization.plan — that legacy column reads "STARTER" for essentially
      // every organization, paying ones included, because nothing that creates
      // an organization ever sets it and the Stripe webhook never corrects it.
      // Nothing reads this field today, which is exactly why it had to change
      // now: the first thing that ever does read it would otherwise have been
      // handed the wrong plan with no warning. One extra lookup on a function
      // that already runs seven queries.
      plan: (await getSubscription(organizationId)).plan,
      currency: org.currency,
    },
    transactions,
    cashflow,
    budget,
    customers,
    subscriptions,
    insights,
  };
}
