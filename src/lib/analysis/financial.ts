import { format } from 'date-fns';
import type { DemoCashflow, DemoCustomerStat, DemoSubscription, DemoTransaction } from '@/lib/demo/data';

const COGS_CATEGORIES = new Set(['cogs']);
const OPEX_CATEGORIES = new Set(['payroll', 'marketing', 'software', 'office', 'travel', 'legal', 'other']);
const MARKETING_CATEGORIES = new Set(['marketing']);

export type MonthlySeriesPoint = {
  period: string;
  revenue: number;
  costs: number;
  grossProfit: number;
  operatingProfit: number;
  netProfit: number;
};

export type KpiSummary = {
  totalRevenue: number;
  totalCosts: number;
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
  burnRate: number;
  cashRunway: number;
  cashAvailable: number;
  workingCapital: number;
  mrr: number;
  activeCustomers: number;
  arpu: number;
  cac: number;
  ltv: number;
  momRevenueGrowth: number;
  momCostGrowth: number;
  momNetMarginDelta: number;
  momCustomersDelta: number;
  momMrrDelta: number;
};

export type CategoryBreakdown = {
  category: string;
  total: number;
  share: number;
};

function groupByMonth(transactions: DemoTransaction[]): MonthlySeriesPoint[] {
  const buckets = new Map<string, { revenue: number; cogs: number; opex: number }>();
  for (const t of transactions) {
    const period = format(t.date, 'yyyy-MM');
    if (!buckets.has(period)) buckets.set(period, { revenue: 0, cogs: 0, opex: 0 });
    const b = buckets.get(period)!;
    if (t.kind === 'REVENUE') b.revenue += t.amount;
    else if (COGS_CATEGORIES.has(t.category)) b.cogs += t.amount;
    else if (OPEX_CATEGORIES.has(t.category)) b.opex += t.amount;
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, { revenue, cogs, opex }]) => {
      const costs = cogs + opex;
      const grossProfit = revenue - cogs;
      const operatingProfit = revenue - cogs - opex;
      const netProfit = operatingProfit * 0.88;
      return { period, revenue, costs, grossProfit, operatingProfit, netProfit };
    });
}

export function monthlySeries(transactions: DemoTransaction[]): MonthlySeriesPoint[] {
  return groupByMonth(transactions);
}

function safeDiv(a: number, b: number) {
  return b === 0 ? 0 : a / b;
}

export function categoryBreakdown(
  transactions: DemoTransaction[],
  kind: 'REVENUE' | 'COST',
): CategoryBreakdown[] {
  const totals = new Map<string, number>();
  let overall = 0;
  for (const t of transactions) {
    if (t.kind !== kind) continue;
    totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount);
    overall += t.amount;
  }
  return Array.from(totals.entries())
    .map(([category, total]) => ({
      category,
      total,
      share: overall === 0 ? 0 : (total / overall) * 100,
    }))
    .sort((a, b) => b.total - a.total);
}

export function cumulativeCashflow(cashflow: DemoCashflow[]) {
  const byMonth = new Map<string, { inflow: number; outflow: number }>();
  for (const c of cashflow) {
    const period = format(c.date, 'yyyy-MM');
    if (!byMonth.has(period)) byMonth.set(period, { inflow: 0, outflow: 0 });
    const b = byMonth.get(period)!;
    if (c.direction === 'INFLOW') b.inflow += c.amount;
    else b.outflow += c.amount;
  }
  let running = 0;
  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, { inflow, outflow }]) => {
      const net = inflow - outflow;
      running += net;
      return { period, inflow, outflow, net, cumulative: running };
    });
}

export function cashflowByCategory(cashflow: DemoCashflow[]) {
  const totals = new Map<string, { inflow: number; outflow: number }>();
  for (const c of cashflow) {
    if (!totals.has(c.category)) totals.set(c.category, { inflow: 0, outflow: 0 });
    const b = totals.get(c.category)!;
    if (c.direction === 'INFLOW') b.inflow += c.amount;
    else b.outflow += c.amount;
  }
  return Array.from(totals.entries()).map(([category, v]) => ({
    category,
    inflow: v.inflow,
    outflow: v.outflow,
    net: v.inflow - v.outflow,
  }));
}

export function computeKpis(args: {
  transactions: DemoTransaction[];
  cashflow: DemoCashflow[];
  customers: DemoCustomerStat[];
  subscriptions: DemoSubscription[];
}): KpiSummary {
  const { transactions, cashflow, customers, subscriptions } = args;
  const series = groupByMonth(transactions);
  const last = series.at(-1);
  const prev = series.at(-2);

  const last3 = series.slice(-3);
  const burnRate = last3.length > 0 ? last3.reduce((s, m) => s + m.costs, 0) / last3.length : 0;

  const totalRevenue = last?.revenue ?? 0;
  const totalCosts = last?.costs ?? 0;
  const grossMargin = last ? (last.grossProfit / Math.max(1, last.revenue)) * 100 : 0;
  const operatingMargin = last ? (last.operatingProfit / Math.max(1, last.revenue)) * 100 : 0;
  const netMargin = last ? (last.netProfit / Math.max(1, last.revenue)) * 100 : 0;

  const cashSeries = cumulativeCashflow(cashflow);
  const cashAvailable = cashSeries.at(-1)?.cumulative ?? 0;
  const cashRunway = burnRate > 0 ? cashAvailable / burnRate : 0;

  const now = new Date();
  const activeSubs = subscriptions.filter((s) => !s.cancelledAt || s.cancelledAt > now);
  const mrr = activeSubs.reduce((s, x) => s + x.mrr, 0);

  const lastCustomer = customers.at(-1);
  const prevCustomer = customers.at(-2);
  const activeCustomers = lastCustomer?.activeCustomers ?? 0;
  const prevActive = prevCustomer?.activeCustomers ?? 0;

  const arpu = activeCustomers > 0 ? totalRevenue / activeCustomers : 0;

  const marketingLastMonth = transactions
    .filter((t) => t.kind === 'COST' && MARKETING_CATEGORIES.has(t.category))
    .filter((t) => format(t.date, 'yyyy-MM') === last?.period)
    .reduce((s, t) => s + t.amount, 0);
  const newCustomers = lastCustomer?.newCustomers ?? 0;
  const cac = newCustomers > 0 ? marketingLastMonth / newCustomers : 0;

  const churned = lastCustomer?.churnedCustomers ?? 0;
  const churnRate = activeCustomers > 0 ? churned / activeCustomers : 0.05;
  const ltv = churnRate > 0 ? arpu * (1 / churnRate) : arpu * 24;

  const momRevenueGrowth = prev ? safeDiv(last!.revenue - prev.revenue, prev.revenue) * 100 : 0;
  const momCostGrowth = prev ? safeDiv(last!.costs - prev.costs, prev.costs) * 100 : 0;
  const prevNet = prev ? (prev.netProfit / Math.max(1, prev.revenue)) * 100 : 0;
  const momNetMarginDelta = netMargin - prevNet;

  const prevMrr = subscriptions
    .filter((s) => s.startedAt <= new Date(new Date(now).setMonth(now.getMonth() - 1)))
    .filter((s) => !s.cancelledAt || s.cancelledAt > new Date(new Date(now).setMonth(now.getMonth() - 1)))
    .reduce((s, x) => s + x.mrr, 0);
  const momMrrDelta = prevMrr > 0 ? ((mrr - prevMrr) / prevMrr) * 100 : 0;

  const momCustomersDelta = prevActive > 0 ? ((activeCustomers - prevActive) / prevActive) * 100 : 0;

  const workingCapital = cashAvailable - (last?.costs ?? 0);

  return {
    totalRevenue,
    totalCosts,
    grossMargin,
    operatingMargin,
    netMargin,
    burnRate,
    cashRunway,
    cashAvailable,
    workingCapital,
    mrr,
    activeCustomers,
    arpu,
    cac,
    ltv,
    momRevenueGrowth,
    momCostGrowth,
    momNetMarginDelta,
    momCustomersDelta,
    momMrrDelta,
  };
}

export function filterTransactionsByPeriod(
  transactions: DemoTransaction[],
  period: '1m' | '3m' | '6m' | '12m' | 'custom',
  customFrom?: string,
  customTo?: string,
) {
  const now = new Date();
  let fromDate = new Date(0);
  switch (period) {
    case '1m':
      fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      break;
    case '3m':
      fromDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      break;
    case '6m':
      fromDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      break;
    case '12m':
      fromDate = new Date(now.getFullYear(), now.getMonth() - 12, 1);
      break;
    case 'custom':
      if (customFrom) fromDate = new Date(customFrom);
      break;
  }
  const toDate = period === 'custom' && customTo ? new Date(customTo) : now;
  return transactions.filter((t) => t.date >= fromDate && t.date <= toDate);
}

export function yoyGrowth(series: MonthlySeriesPoint[]) {
  if (series.length < 2) return 0;
  const last = series.at(-1)!;
  const oldest = series[0];
  return oldest.revenue > 0 ? ((last.revenue - oldest.revenue) / oldest.revenue) * 100 : 0;
}
