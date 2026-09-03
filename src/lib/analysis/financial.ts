import { toAppDateString } from '@/lib/timezone';
import type { DemoCashflow, DemoCustomerStat, DemoSubscription, DemoTransaction } from '@/lib/demo/data';

const COGS_CATEGORIES = new Set(['cogs']);
const MARKETING_CATEGORIES = new Set(['marketing']);

// Monthly bucket key in Europe/Rome, not the server's own timezone (UTC on
// Vercel). date-fns' format() reads the JS Date through the RUNTIME'S local
// timezone, so a transaction at 31/08 23:30 UTC (= 01/09 01:30 in Italy) used
// to land in the August bucket here while the rest of the app — and the AI
// context built from the same organization's data — already read it as
// September (see src/lib/ai-context.ts and CLAUDE.md §7). Same day, two
// different months shown to the same user.
function monthKey(d: Date): string {
  return toAppDateString(d).slice(0, 7);
}

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
  // null when there is no revenue to divide by (no data for the period, or
  // revenue <= 0): a margin of "0%" would claim break-even when the figure is
  // actually not derivable. See computeKpis below.
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  burnRate: number;
  // Always null: a "months of runway" figure needs the organization's REAL
  // account balance, which this schema never holds (cashAvailable below is a
  // cumulative sum of recorded movements with an implicit zero starting
  // point, not a bank balance — see computeKpis). isBurningCash answers the
  // one related question that IS honestly derivable without a balance.
  cashRunway: null;
  isBurningCash: boolean;
  cashAvailable: number;
  workingCapital: number;
  mrr: number;
  activeCustomers: number;
  // null when there are no active customers this period to divide by.
  arpu: number | null;
  // null when there were no new customers this period to divide by.
  cac: number | null;
  // null when there are no active customers, or nobody has churned yet — a
  // true churn rate cannot be assumed to be zero just because no one has
  // left so far. See computeKpis.
  ltv: number | null;
  // null when there is no prior period to compare against, or the prior
  // period's base value was <= 0: "0% growth" would claim stagnation when the
  // comparison is actually impossible.
  momRevenueGrowth: number | null;
  momCostGrowth: number | null;
  momNetMarginDelta: number | null;
  momCustomersDelta: number | null;
  momMrrDelta: number | null;
};

export type CategoryBreakdown = {
  category: string;
  total: number;
  share: number;
};

function groupByMonth(transactions: DemoTransaction[]): MonthlySeriesPoint[] {
  const buckets = new Map<string, { revenue: number; cogs: number; opex: number }>();
  for (const t of transactions) {
    const period = monthKey(t.date);
    if (!buckets.has(period)) buckets.set(period, { revenue: 0, cogs: 0, opex: 0 });
    const b = buckets.get(period)!;
    if (t.kind === 'REVENUE') b.revenue += t.amount;
    else if (COGS_CATEGORIES.has(t.category)) b.cogs += t.amount;
    // Any non-COGS cost counts as opex, whatever its category: user-imported
    // categories must never silently disappear from totals.
    else b.opex += t.amount;
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, { revenue, cogs, opex }]) => {
      const costs = cogs + opex;
      const grossProfit = revenue - cogs;
      const operatingProfit = revenue - cogs - opex;
      // With the current transactional data the net result is not distinguishable
      // from the operating one: there is no taxes/interest category in the model.
      // When a dedicated fiscal category exists, subtract it here.
      const netProfit = operatingProfit;
      return { period, revenue, costs, grossProfit, operatingProfit, netProfit };
    });
}

export function monthlySeries(transactions: DemoTransaction[]): MonthlySeriesPoint[] {
  return groupByMonth(transactions);
}

// null on a zero denominator: growth "from zero" is not a percentage, it is
// unmeasurable (going from €0 to €50,000 is not "0% growth"). Used only by the
// two mom growth figures below — every other caller of division-by-count in
// this file (share, arpu, cac, …) is untouched, see the audit report this
// change was requested from for why those are out of scope here.
function safeDiv(a: number, b: number): number | null {
  return b === 0 ? null : a / b;
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
    const period = monthKey(c.date);
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
  // No data for the period (last undefined) is the same "not derivable" case
  // as revenue <= 0: there is no honest margin to report in either case.
  const grossMargin = last && last.revenue > 0 ? (last.grossProfit / last.revenue) * 100 : null;
  const operatingMargin = last && last.revenue > 0 ? (last.operatingProfit / last.revenue) * 100 : null;
  const netMargin = last && last.revenue > 0 ? (last.netProfit / last.revenue) * 100 : null;

  const cashSeries = cumulativeCashflow(cashflow);
  // cashAvailable is a CUMULATIVE SUM of recorded cashflow movements, not a
  // real bank balance — nothing in this schema holds an opening balance (see
  // the cashflow derivation in api/financial-query.ts). That makes a "months
  // of runway" figure permanently uncomputable from it, whether or not the
  // org is burning cash:
  //  - not burning (isBurningCash false): the qualitative claim needs no
  //    balance at all, so it is stated as a message, never a number;
  //  - burning (isBurningCash true): a real months-until-zero figure needs
  //    the REAL account balance, which Anlyra does not have, so still no
  //    number — the KpiCard shows why instead.
  // cashRunway therefore never carries a value; see the KpiCard call sites.
  const cashAvailable = cashSeries.at(-1)?.cumulative ?? 0;
  const cashRunway = null;
  const last3Revenue = last3.length > 0 ? last3.reduce((s, m) => s + m.revenue, 0) / last3.length : 0;
  const isBurningCash = burnRate - last3Revenue > 0;

  const now = new Date();
  const activeSubs = subscriptions.filter((s) => !s.cancelledAt || s.cancelledAt > now);
  const mrr = activeSubs.reduce((s, x) => s + x.mrr, 0);

  const lastCustomer = customers.at(-1);
  const prevCustomer = customers.at(-2);
  const activeCustomers = lastCustomer?.activeCustomers ?? 0;
  const prevActive = prevCustomer?.activeCustomers ?? 0;

  const arpu = safeDiv(totalRevenue, activeCustomers);

  const marketingLastMonth = transactions
    .filter((t) => t.kind === 'COST' && MARKETING_CATEGORIES.has(t.category))
    .filter((t) => monthKey(t.date) === last?.period)
    .reduce((s, t) => s + t.amount, 0);
  const newCustomers = lastCustomer?.newCustomers ?? 0;
  const cac = safeDiv(marketingLastMonth, newCustomers);

  // LTV needs a real, nonzero churn rate. When nobody has churned yet the
  // true rate is unknown — it could be 0%, or it could just be too early to
  // tell — not a number to guess at. No invented constants: the previous
  // code assumed a fixed 24-month customer lifetime here, and a fixed 5%
  // churn rate when there were no active customers at all.
  const churned = lastCustomer?.churnedCustomers ?? 0;
  const churnRate = activeCustomers > 0 ? safeDiv(churned, activeCustomers) : null;
  const ltv = arpu !== null && churnRate !== null && churnRate > 0 ? arpu * (1 / churnRate) : null;

  // "No previous period" is the same unmeasurable case as safeDiv's own
  // zero-denominator guard (there is nothing to compare against either way),
  // so both fold to null instead of the previous fallback of 0.
  const rawRevenueGrowth = prev ? safeDiv(last!.revenue - prev.revenue, prev.revenue) : null;
  const momRevenueGrowth = rawRevenueGrowth === null ? null : rawRevenueGrowth * 100;
  const rawCostGrowth = prev ? safeDiv(last!.costs - prev.costs, prev.costs) : null;
  const momCostGrowth = rawCostGrowth === null ? null : rawCostGrowth * 100;
  // Same revenue<=0 rule as netMargin above, applied to the PRIOR period, so
  // the delta below never subtracts a real number from a period that in fact
  // had no derivable margin.
  const prevNet = prev && prev.revenue > 0 ? (prev.netProfit / prev.revenue) * 100 : null;
  const momNetMarginDelta = netMargin === null || prevNet === null ? null : netMargin - prevNet;

  const prevMrr = subscriptions
    .filter((s) => s.startedAt <= new Date(new Date(now).setMonth(now.getMonth() - 1)))
    .filter((s) => !s.cancelledAt || s.cancelledAt > new Date(new Date(now).setMonth(now.getMonth() - 1)))
    .reduce((s, x) => s + x.mrr, 0);
  const rawMrrDelta = safeDiv(mrr - prevMrr, prevMrr);
  const momMrrDelta = rawMrrDelta === null ? null : rawMrrDelta * 100;

  const rawCustomersDelta = safeDiv(activeCustomers - prevActive, prevActive);
  const momCustomersDelta = rawCustomersDelta === null ? null : rawCustomersDelta * 100;

  const workingCapital = cashAvailable - (last?.costs ?? 0);

  return {
    totalRevenue,
    totalCosts,
    grossMargin,
    operatingMargin,
    netMargin,
    burnRate,
    cashRunway,
    isBurningCash,
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
