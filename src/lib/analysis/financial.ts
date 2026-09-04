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
// unmeasurable (going from €0 to €50,000 is not "0% growth"). Exported so the
// revenue/costs routes can apply the same rule to their own parallel mom/yoy/
// ratio figures instead of each hand-rolling a fallback to 0.
export function safeDiv(a: number, b: number): number | null {
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
  /**
   * Data for the COMPARISON period, entirely supplied by the caller — this
   * function never derives "the previous period" on its own. Build it with
   * comparisonWindow() + filterTransactionsByWindow() (both above), the same
   * day-parity rule the caller applies to its own primary window, so a
   * partial current month is never held up against a full prior one.
   *
   * `asOf` is the comparison window's own "now" — the moment subscriptions
   * are evaluated as active/cancelled at, mirroring how `subscriptions` is
   * evaluated against the real `now` for the CURRENT period below. Omit the
   * whole `comparison` object when the caller has no fair comparison period
   * to offer (e.g. it does not expose any mom/delta figure to the user):
   * every comparison field then comes back null, never guessed.
   */
  comparison?: {
    transactions: DemoTransaction[];
    customers: DemoCustomerStat[];
    asOf: Date;
  };
}): KpiSummary {
  const { transactions, cashflow, customers, subscriptions, comparison } = args;
  const series = groupByMonth(transactions);
  const last = series.at(-1);

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
  const activeCustomers = lastCustomer?.activeCustomers ?? 0;

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

  // Everything below compares against the CALLER-supplied comparison period
  // — never a bucket derived from `transactions`/`customers` themselves (no
  // more series.at(-2) or customers.at(-2), which were "whatever the
  // adjacent calendar-month bucket happened to be", not a day-parity match
  // for a partial current period). No `comparison` supplied => `prev` is
  // undefined and every field below is null, the same "not calculable" path
  // as an unfair (zero-denominator) comparison — never a guessed number.
  const compSeries = comparison ? groupByMonth(comparison.transactions) : [];
  const prev = compSeries.at(-1);

  const rawRevenueGrowth = prev ? safeDiv(last!.revenue - prev.revenue, prev.revenue) : null;
  const momRevenueGrowth = rawRevenueGrowth === null ? null : rawRevenueGrowth * 100;
  const rawCostGrowth = prev ? safeDiv(last!.costs - prev.costs, prev.costs) : null;
  const momCostGrowth = rawCostGrowth === null ? null : rawCostGrowth * 100;
  // Same revenue<=0 rule as netMargin above, applied to the COMPARISON
  // period, so the delta below never subtracts a real number from a period
  // that in fact had no derivable margin.
  const prevNet = prev && prev.revenue > 0 ? (prev.netProfit / prev.revenue) * 100 : null;
  const momNetMarginDelta = netMargin === null || prevNet === null ? null : netMargin - prevNet;

  // MRR and active-customer deltas: comparison.asOf is the ONE moment
  // subscriptions are evaluated at for the comparison side — mirroring how
  // `subscriptions` is evaluated against the real `now` above for the
  // current side. safeDiv's own zero-denominator guard already returns null
  // when there is no comparison (prevMrr/prevActive both default to 0 below,
  // same as an unfair comparison with a real but zero base), so nothing here
  // needs a separate "was `comparison` supplied at all" branch.
  const prevMrr = comparison
    ? subscriptions
        .filter((s) => s.startedAt <= comparison.asOf)
        .filter((s) => !s.cancelledAt || s.cancelledAt > comparison.asOf)
        .reduce((s, x) => s + x.mrr, 0)
    : 0;
  const rawMrrDelta = safeDiv(mrr - prevMrr, prevMrr);
  const momMrrDelta = rawMrrDelta === null ? null : rawMrrDelta * 100;

  const prevActive = comparison?.customers.at(-1)?.activeCustomers ?? 0;
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

const PERIOD_MONTHS = { '1m': 1, '3m': 3, '6m': 6, '12m': 12 } as const;

/** Last day of `monthIndex` (0-based) in `year`. Day 0 of the next month is,
 * by definition, the last day of this one — no day-of-month is ever read
 * back off an existing Date here, so this cannot suffer the classic
 * setMonth() overflow ("Feb 31" silently becoming "Mar 3") that
 * alerts/rules.ts and the AI benchmark/forecasting routes have. */
function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Boundaries of "N months", per the founder's definition: the CURRENT month
 * (day 1 through today, declared partial) plus the N-1 preceding COMPLETE
 * calendar months. "Today" is read in Europe/Rome (toAppDateString), not the
 * server's own timezone (UTC on Vercel) — near midnight Rome time the server
 * can still be on yesterday's date, which would anchor the whole window one
 * day (and sometimes one month) too early. Same fix as monthKey() above, for
 * the same reason (CLAUDE.md §7).
 *
 * fromDate is always the 1st of some month, constructed directly via
 * `new Date(year, monthIndex, 1)` — day 1 exists in every month, and a
 * negative monthIndex correctly rolls the year back (verified: Date(2026,
 * -11, 1) => 2025-02-01), so this half has no overflow risk either.
 */
export function periodWindow(
  period: '1m' | '3m' | '6m' | '12m' | 'custom',
  customFrom?: string,
  customTo?: string,
): { from: Date; to: Date } {
  const now = new Date();
  if (period === 'custom') {
    return {
      from: customFrom ? new Date(customFrom) : new Date(0),
      to: customTo ? new Date(customTo) : now,
    };
  }
  const [romeYear, romeMonth] = toAppDateString(now).split('-').map(Number);
  const currentMonthIndex = romeMonth - 1; // toAppDateString's month is 1-based
  const n = PERIOD_MONTHS[period];
  return {
    from: new Date(romeYear, currentMonthIndex - (n - 1), 1),
    to: now,
  };
}

/**
 * The comparison window for a period, per the founder's day-parity rule: the
 * SAME shape (same count of complete months, same number of days in the
 * partial month) shifted back by `monthsShift` months — never the naive
 * "whole calendar month before", which would compare a handful of days in
 * the current month against a full prior month.
 *
 * `to`'s day-of-month is explicitly clamped to the comparison month's real
 * length (via daysInMonth) rather than read off a shifted Date — shifting
 * "Oct 31" back one month via setMonth() would silently ask for "Sept 31",
 * which does not exist, and roll over into October. Same bug class as
 * alerts/rules.ts, avoided the same way daysInMonth avoids it above: no
 * day-of-month is ever carried across a setMonth() call.
 */
export function comparisonWindow(
  window: { from: Date; to: Date },
  monthsShift: number,
): { from: Date; to: Date } {
  const from = new Date(window.from.getFullYear(), window.from.getMonth() - monthsShift, 1);
  const toYear = window.to.getFullYear();
  const toMonthIndex = window.to.getMonth() - monthsShift;
  const clampedDay = Math.min(window.to.getDate(), daysInMonth(toYear, toMonthIndex));
  const to = new Date(toYear, toMonthIndex, clampedDay, 23, 59, 59, 999);
  return { from, to };
}

// Generic over anything date-stamped (DemoTransaction or DemoCashflow): same
// exact window logic either way, so the routes can filter cashflow entries
// with this instead of hand-rolling a second copy of the same date math.
export function filterTransactionsByPeriod<T extends { date: Date }>(
  transactions: T[],
  period: '1m' | '3m' | '6m' | '12m' | 'custom',
  customFrom?: string,
  customTo?: string,
): T[] {
  const { from, to } = periodWindow(period, customFrom, customTo);
  return transactions.filter((t) => t.date >= from && t.date <= to);
}

/** Filters by an explicit [from, to] window rather than a named period —
 * for comparisonWindow()'s output, which routes need to filter against
 * directly for day-parity mom/yoy figures. */
export function filterTransactionsByWindow<T extends { date: Date }>(
  transactions: T[],
  window: { from: Date; to: Date },
): T[] {
  return transactions.filter((t) => t.date >= window.from && t.date <= window.to);
}

// True year-over-year: the SAME calendar month twelve months before the
// latest one, addressed by its own period key — not "whatever happens to be
// first in the array passed in", which compared against an arbitrary-length
// window and called it "year over year" regardless of how much history was
// actually available. null when that month isn't in the series (fewer than
// twelve months of history, or a shorter period filter cut it out) or had no
// revenue to compare against.
export function yoyGrowth(series: MonthlySeriesPoint[]): number | null {
  const last = series.at(-1);
  if (!last) return null;
  const [year, month] = last.period.split('-').map(Number);
  const targetPeriod = `${year - 1}-${String(month).padStart(2, '0')}`;
  const yearAgo = series.find((s) => s.period === targetPeriod);
  if (!yearAgo) return null;
  const raw = safeDiv(last.revenue - yearAgo.revenue, yearAgo.revenue);
  return raw === null ? null : raw * 100;
}
