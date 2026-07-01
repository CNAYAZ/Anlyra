import { z } from 'zod';
import { endOfMonth, startOfMonth } from 'date-fns';
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

function parseCategory(description: string): { category: string; subcategory: string } {
  const [category, subcategory] = (description ?? '').split('/');
  return {
    category: category?.trim() || 'other',
    subcategory: subcategory?.trim() || '',
  };
}

function monthKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export async function getOrgData(): Promise<DemoDataset> {
  const { organizationId } = await getCurrentContext();
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

  const cashflow: DemoCashflow[] = [];
  for (const period of sortedMonths) {
    const m = monthlyMap.get(period)!;
    const [yyyy, mm] = period.split('-').map(Number);
    const monthEnd = endOfMonth(new Date(yyyy, mm - 1, 1));
    cashflow.push(
      {
        id: `cf_in_op_${period}`,
        date: monthEnd,
        direction: 'INFLOW',
        category: 'operating',
        amount: Math.round(m.revenue * 0.92),
        description: 'Operating inflow',
      },
      {
        id: `cf_out_op_${period}`,
        date: monthEnd,
        direction: 'OUTFLOW',
        category: 'operating',
        amount: Math.round(m.cost * 0.94),
        description: 'Operating outflow',
      },
      {
        id: `cf_out_inv_${period}`,
        date: monthEnd,
        direction: 'OUTFLOW',
        category: 'investing',
        amount: Math.round(m.cost * 0.06),
        description: 'Capex / tooling',
      },
    );
  }

  const budget: DemoBudget[] = [];
  for (const period of sortedMonths) {
    const m = monthlyMap.get(period)!;
    budget.push({
      id: `b_rev_${period}`,
      period,
      category: 'revenue',
      planned: Math.round(m.revenue * 1.05),
      actual: Math.round(m.revenue),
    });
    const weights: Record<string, number> = {
      payroll: 0.42,
      cogs: 0.18,
      marketing: 0.14,
      software: 0.1,
      office: 0.07,
    };
    for (const [cat, w] of Object.entries(weights)) {
      const planned = Math.round(m.cost * w * 1.05);
      const actual = Math.round(m.cost * w);
      budget.push({ id: `b_${cat}_${period}`, period, category: cat, planned, actual });
    }
  }

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

  // Subscriptions: still synthesized from monthly revenue (unchanged — real
  // Subscription reads are step 2 of this refactor).
  const subscriptions: DemoSubscription[] = [];
  for (const period of sortedMonths) {
    const m = monthlyMap.get(period)!;
    const newC = Math.max(8, Math.round(m.revenue / 5_500));
    const [yyyy, mm] = period.split('-').map(Number);
    const monthStart = startOfMonth(new Date(yyyy, mm - 1, 1));
    const plans = [
      { plan: 'starter', mrr: 29 },
      { plan: 'pro', mrr: 79 },
      { plan: 'enterprise', mrr: 199 },
    ];
    for (let j = 0; j < newC; j += 1) {
      const p = plans[j % plans.length];
      subscriptions.push({
        customer: `cust_${period}_${j}`,
        plan: p.plan,
        mrr: p.mrr,
        startedAt: monthStart,
        cancelledAt: null,
      });
    }
  }

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
      plan: org.plan,
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
