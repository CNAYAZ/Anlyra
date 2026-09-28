import {
  daysInAppMonth,
  fromAppWallClock,
  shiftAppMonth,
  toAppDateString,
  toAppWallClock,
} from '@/lib/timezone';
import type { DemoCashflow, DemoCustomerStat, DemoSubscription, DemoTransaction } from '@/lib/demo/data';
import { analyzeCategoryColumn } from '@/lib/import/free-text';

const COGS_CATEGORIES = new Set(['cogs']);
const MARKETING_CATEGORIES = new Set(['marketing']);

// Monthly bucket key in Europe/Rome, not the server's own timezone (UTC on
// Vercel). date-fns' format() reads the JS Date through the RUNTIME'S local
// timezone, so a transaction at 31/08 23:30 UTC (= 01/09 01:30 in Italy) used
// to land in the August bucket here while the rest of the app — and the AI
// context built from the same organization's data — already read it as
// September (see src/lib/ai-context.ts and CLAUDE.md §7). Same day, two
// different months shown to the same user.
export function monthKey(d: Date): string {
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

/**
 * Totals for a WHOLE set of transactions — the sum across every month it
 * contains, not the latest month inside it.
 *
 * This exists next to computeKpis rather than inside it because the two
 * answer different questions and both are needed at once. computeKpis'
 * totalRevenue/totalCosts are `last?.revenue`/`last?.costs`, i.e. the most
 * recent month alone, which is what the Overview (fixed period, no filter)
 * shows and what its mom* figures are built on. Every page that carries a
 * PeriodFilter needs the other answer: the total of the period the customer
 * actually selected, which otherwise did not move when they moved the filter.
 *
 * Built on groupByMonth so the COGS/opex classification, and therefore the
 * three margins, are derived exactly the same way as everywhere else — never
 * a second, parallel definition of what a cost is.
 */
export type PeriodTotals = {
  revenue: number;
  costs: number;
  /** null when the period has no revenue to divide by: a "0%" margin would
   * claim break-even where the figure is simply not derivable. Same rule as
   * computeKpis' own margins. */
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
};

export function periodTotals(transactions: DemoTransaction[]): PeriodTotals {
  const months = groupByMonth(transactions);
  const sum = (pick: (m: MonthlySeriesPoint) => number) => months.reduce((s, m) => s + pick(m), 0);
  const revenue = sum((m) => m.revenue);
  const share = (profit: number) => (revenue > 0 ? (profit / revenue) * 100 : null);
  return {
    revenue,
    costs: sum((m) => m.costs),
    grossMargin: share(sum((m) => m.grossProfit)),
    operatingMargin: share(sum((m) => m.operatingProfit)),
    netMargin: share(sum((m) => m.netProfit)),
  };
}

/**
 * The selected period against the equivalent period before it — NOT the
 * month-over-month figures computeKpis produces. A page whose headline number
 * is "the total of the last twelve months" cannot carry a badge that talks
 * about September: the big number and the small one would be describing
 * different stretches of time.
 *
 * `previous` is null when there is no equivalent previous period to build
 * (see periodMonths: a custom date range has no defined "one before it"), and
 * every figure is null when the previous period had nothing to divide by.
 * Null, never zero: "0% growth" claims stagnation where the comparison was in
 * fact impossible.
 */
export type PeriodComparison = {
  revenueGrowth: number | null;
  costGrowth: number | null;
  netMarginDelta: number | null;
};

export function comparePeriodTotals(
  current: PeriodTotals,
  previous: PeriodTotals | null,
): PeriodComparison {
  if (!previous) return { revenueGrowth: null, costGrowth: null, netMarginDelta: null };
  const pct = (raw: number | null) => (raw === null ? null : raw * 100);
  return {
    revenueGrowth: pct(safeDiv(current.revenue - previous.revenue, previous.revenue)),
    costGrowth: pct(safeDiv(current.costs - previous.costs, previous.costs)),
    netMarginDelta:
      current.netMargin === null || previous.netMargin === null
        ? null
        : current.netMargin - previous.netMargin,
  };
}

/**
 * How many months a named period covers, for shifting a window back by a
 * whole equivalent period with comparisonWindow(). null for 'custom': an
 * arbitrary date range has no defined "equivalent period before it", so the
 * callers show "not available" with the reason rather than inventing one.
 */
export function periodMonths(period: '1m' | '3m' | '6m' | '12m' | 'custom'): number | null {
  return period === 'custom' ? null : PERIOD_MONTHS[period];
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
   * `asOf` and `currentAsOf` are the two windows' own ends — the moments
   * subscriptions are evaluated as active/cancelled at, and, crucially, what
   * NAMES the two months being compared: every mom* figure below addresses
   * its monthly bucket by that month's key, never by position in the series.
   * Omit the whole `comparison` object when the caller has no fair comparison
   * period to offer (e.g. it does not expose any mom/delta figure to the
   * user): every comparison field then comes back null, never guessed.
   */
  comparison?: {
    transactions: DemoTransaction[];
    customers: DemoCustomerStat[];
    /** End of the COMPARISON window: names the earlier of the two months. */
    asOf: Date;
    /** End of the CURRENT window: names the later of the two months. */
    currentAsOf: Date;
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

  // Both sides are addressed BY MONTH KEY, never by position. groupByMonth
  // creates a bucket only for months that actually contain movements, so
  // .at(-1) meant "the most recent month that happens to have data", not "the
  // month being asked about": an organization with no takings between the 1st
  // and the 4th of August had its September held up against the WHOLE of
  // July, and a doubling of revenue was displayed as -74% (verified on
  // fixture). When either month has no bucket, every figure below is null and
  // the interface says "not available" — never another month's bucket.
  const currentKey = comparison ? monthKey(comparison.currentAsOf) : null;
  const comparisonKey = comparison ? monthKey(comparison.asOf) : null;
  const currentMonth = currentKey ? series.find((m) => m.period === currentKey) : undefined;
  const prev = comparisonKey ? compSeries.find((m) => m.period === comparisonKey) : undefined;
  const comparable = currentMonth && prev ? { currentMonth, prev } : null;

  const rawRevenueGrowth = comparable
    ? safeDiv(comparable.currentMonth.revenue - comparable.prev.revenue, comparable.prev.revenue)
    : null;
  const momRevenueGrowth = rawRevenueGrowth === null ? null : rawRevenueGrowth * 100;
  const rawCostGrowth = comparable
    ? safeDiv(comparable.currentMonth.costs - comparable.prev.costs, comparable.prev.costs)
    : null;
  const momCostGrowth = rawCostGrowth === null ? null : rawCostGrowth * 100;
  // Same revenue<=0 rule as netMargin above, applied to BOTH months, so the
  // delta never subtracts a real number from a month that in fact had no
  // derivable margin. Read off currentMonth rather than the netMargin field
  // above for the same reason as everything else here: netMargin comes from
  // `last`, which is a position, not the month being named.
  const currentNet =
    currentMonth && currentMonth.revenue > 0 ? (currentMonth.netProfit / currentMonth.revenue) * 100 : null;
  const prevNet = prev && prev.revenue > 0 ? (prev.netProfit / prev.revenue) * 100 : null;
  const momNetMarginDelta = currentNet === null || prevNet === null ? null : currentNet - prevNet;

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

  // CustomerStat is a monthly snapshot keyed "YYYY-MM", so it has exactly the
  // same "bucket only where there is data" problem as the transaction series
  // above, and gets exactly the same treatment: both snapshots are looked up
  // by their month's key. .at(-1) on either side meant "the most recent
  // snapshot that exists", which for an organization that skipped a month
  // silently compared two months that were not one month apart.
  const currentStat = currentKey ? customers.find((c) => c.period === currentKey) : undefined;
  const prevStat = comparisonKey ? comparison?.customers.find((c) => c.period === comparisonKey) : undefined;
  const rawCustomersDelta =
    currentStat && prevStat
      ? safeDiv(currentStat.activeCustomers - prevStat.activeCustomers, prevStat.activeCustomers)
      : null;
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

/** First or last instant of a "YYYY-MM-DD" calendar day as lived in Italy. */
function dayBoundary(isoDate: string, edge: 'start' | 'end'): Date {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);
  return edge === 'start'
    ? fromAppWallClock({ year, month, day, hour: 0, minute: 0, second: 0, ms: 0 })
    : fromAppWallClock({ year, month, day, hour: 23, minute: 59, second: 59, ms: 999 });
}

/**
 * Boundaries of "N months", per the founder's definition: the CURRENT month
 * (day 1 through today, declared partial) plus the N-1 preceding COMPLETE
 * calendar months. Every boundary is an ITALIAN wall-clock instant, built
 * with fromAppWallClock — never `new Date(year, monthIndex, 1)`, which reads
 * the SERVER's timezone (UTC on Vercel) and therefore placed the start of the
 * month at 02:00 Italian time, silently dropping anything recorded in the
 * first two hours of day 1 while monthKey() (Rome-based, above) still counted
 * it as part of that month. Same rule, same reason, as CLAUDE.md §7.
 *
 * The month shift goes through shiftAppMonth, which never carries a
 * day-of-month across the shift, so it cannot suffer the setMonth() overflow
 * ("Feb 31" silently becoming "Mar 3") that alerts/rules.ts and the AI
 * benchmark/forecasting routes have.
 */
export function periodWindow(
  period: '1m' | '3m' | '6m' | '12m' | 'custom',
  customFrom?: string,
  customTo?: string,
): { from: Date; to: Date } {
  const now = new Date();
  if (period === 'custom') {
    // A custom range is inclusive of both days the customer picked, read in
    // Italy. `new Date('2026-08-31')` is midnight UTC, i.e. 02:00 in Italy, so
    // the range "1 to 31 August" used to start two hours into the 1st and end
    // at the very start of the 31st — silently dropping that whole last day
    // (verified: a movement on 31 August at 09:00 fell outside the range that
    // named it). Same Rome-anchoring rule as the named periods below.
    return {
      from: customFrom ? dayBoundary(customFrom, 'start') : new Date(0),
      to: customTo ? dayBoundary(customTo, 'end') : now,
    };
  }
  const today = toAppWallClock(now);
  const first = shiftAppMonth(today.year, today.month, PERIOD_MONTHS[period] - 1);
  return {
    from: fromAppWallClock({ ...first, day: 1, hour: 0, minute: 0, second: 0, ms: 0 }),
    to: now,
  };
}

/**
 * The comparison window for a period, per the founder's day-parity rule: the
 * SAME shape (same count of complete months, same day-of-month AND same time
 * of day in the partial month) shifted back by `monthsShift` months — never
 * the naive "whole calendar month before", which would compare a handful of
 * days in the current month against a full prior month.
 *
 * `to` matches the primary window's Italian wall-clock time down to the
 * millisecond, not just the calendar day. It used to end at 23:59:59.999
 * while the primary window ended at the current hour: an organization that
 * records its takings during office hours, looked at in the morning, held
 * three elapsed days of this month against four complete days of last month
 * and read as a collapse — a number that then "recovered" on its own as the
 * day went by. Verified on fixture: a company that had doubled its revenue
 * showed +50% at 08:34, and +100% only once the day was over.
 *
 * `to`'s day-of-month is clamped to the comparison month's real length (via
 * daysInAppMonth) rather than read off a shifted Date — asking for "Sept 31"
 * would roll over into October.
 */
export function comparisonWindow(
  window: { from: Date; to: Date },
  monthsShift: number,
): { from: Date; to: Date } {
  const fromClock = toAppWallClock(window.from);
  const shiftedFrom = shiftAppMonth(fromClock.year, fromClock.month, monthsShift);

  const toClock = toAppWallClock(window.to);
  const shiftedTo = shiftAppMonth(toClock.year, toClock.month, monthsShift);
  const day = Math.min(toClock.day, daysInAppMonth(shiftedTo.year, shiftedTo.month));

  return {
    from: fromAppWallClock({ ...shiftedFrom, day: 1, hour: 0, minute: 0, second: 0, ms: 0 }),
    to: fromAppWallClock({
      ...shiftedTo,
      day,
      hour: toClock.hour,
      minute: toClock.minute,
      second: toClock.second,
      ms: toClock.ms,
    }),
  };
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

/**
 * "What changed": how each category moved between a period and its
 * comparison period, for revenue or for costs. The ONE place this is
 * computed — the costs and revenue pages and the AI context all call
 * periodChangeBreakdown() below, so the page and the chat can never tell two
 * different stories about the same months.
 *
 * NUMBERS RULE: every figure is a sum of recorded movements, nothing is
 * estimated. Sums are taken in whole cents (each movement's euro amount
 * converted to cents once), so the category changes add up EXACTLY to the
 * total change — no float drift to paper over, no rounding to make it add up.
 * When a comparison or a share cannot be computed honestly, it is null and
 * the reason says why.
 */
export type ChangeUnavailableReason =
  /** A custom date range has no defined "equivalent period before it" (see periodMonths). */
  | 'CUSTOM_PERIOD'
  /** The comparison period has no movements of this kind: nothing to compare against. */
  | 'NO_PREVIOUS_DATA'
  /** The selected period has no movements of this kind yet (data is imported by hand, so
   *  "nothing" usually means "not loaded yet", not "fell to zero"). */
  | 'NO_CURRENT_DATA';

export type SharesHiddenReason =
  /** The total barely moved (under 0.5% of the larger of the two totals): a share of
   *  a near-zero change is a large number that means nothing. */
  | 'NEGLIGIBLE_TOTAL_CHANGE'
  /** Categories moved in opposite directions and largely cancelled out (the net change
   *  is under half of all the movement): shares would run past ±200%. */
  | 'OFFSETTING_CHANGES';

export type CategoryChange = {
  /** The category as the customer recorded it; '' for movements with no category. */
  category: string;
  /** True for movements recorded with no category at all — shown as their own line, never hidden. */
  uncategorized: boolean;
  previous: number;
  current: number;
  /** current − previous. */
  change: number;
  /** This category's part of the total change, in % (they sum to 100: a category that moved
   *  against the total has a negative share, and the others then sum past 100). null when
   *  shares are hidden — see sharesHiddenReason. */
  share: number | null;
  /** 'new': only in the selected period; 'gone': only in the comparison period. */
  presence: 'both' | 'new' | 'gone';
};

export type ChangeBreakdown = {
  kind: 'REVENUE' | 'COST';
  /** Calendar days (Europe/Rome, YYYY-MM-DD) the two totals cover. */
  currentPeriod: { from: string; to: string };
  previousPeriod: { from: string; to: string } | null;
  currentTotal: number;
  /** null when there is no comparison period at all (custom range). */
  previousTotal: number | null;
  /** null when a comparison is available — otherwise why not. */
  unavailableReason: ChangeUnavailableReason | null;
  totalChange: number | null;
  /** totalChange as % of previousTotal (never divided by zero: previousTotal > 0 when available). */
  totalChangePct: number | null;
  sharesHiddenReason: SharesHiddenReason | null;
  /** Some categories went up while others went down. */
  mixedDirections: boolean;
  /** The categories look like the free text of a bank statement (almost one per movement,
   *  several words each) — same shape test as the import warning (analyzeCategoryColumn). */
  categoriesLookLikeFreeText: boolean;
  /** Every category present in either period, largest absolute change first. Empty when unavailable. */
  categories: CategoryChange[];
};

/** Below this share of the larger total, the total is "essentially unchanged". */
const NEGLIGIBLE_CHANGE_RATIO = 0.005;
/** Shares are shown only when the net change is at least this share of all the movement
 *  (sum of absolute category changes), which bounds every share within ±200%. */
const MIN_NET_TO_GROSS_RATIO = 0.5;

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * A movement has no category when the category part of its stored description
 * is empty — exactly the case parseCategory (api/financial-query.ts) turns
 * into 'other'. Read from the raw description because 'other' is ALSO a real
 * category name people use (the demo dataset has one): the two must not merge.
 */
function isUncategorized(t: DemoTransaction): boolean {
  return (t.description ?? '').split('/')[0].trim() === '';
}

function sumByCategory(transactions: DemoTransaction[], kind: 'REVENUE' | 'COST') {
  const byKey = new Map<string, { category: string; uncategorized: boolean; cents: number }>();
  let total = 0;
  let count = 0;
  for (const t of transactions) {
    if (t.kind !== kind) continue;
    const uncategorized = isUncategorized(t);
    const key = uncategorized ? '\u0000uncategorized' : t.category;
    const entry = byKey.get(key) ?? { category: uncategorized ? '' : t.category, uncategorized, cents: 0 };
    const cents = toCents(t.amount);
    entry.cents += cents;
    total += cents;
    count += 1;
    byKey.set(key, entry);
  }
  return { byKey, totalCents: total, count };
}

/** Same thresholds as the import warning, applied to the categories of the movements compared. */
function looksLikeFreeText(transactions: DemoTransaction[], kind: 'REVENUE' | 'COST'): boolean {
  const values = transactions.filter((t) => t.kind === kind && !isUncategorized(t)).map((t) => t.category);
  return analyzeCategoryColumn(values).suspect;
}

export function changeBreakdown(args: {
  kind: 'REVENUE' | 'COST';
  current: { window: { from: Date; to: Date }; transactions: DemoTransaction[] };
  /** null when the period has no equivalent period before it (custom range). */
  previous: { window: { from: Date; to: Date }; transactions: DemoTransaction[] } | null;
}): ChangeBreakdown {
  const { kind, current, previous } = args;
  const cur = sumByCategory(current.transactions, kind);
  const prev = previous ? sumByCategory(previous.transactions, kind) : null;
  const days = (w: { from: Date; to: Date }) => ({ from: toAppDateString(w.from), to: toAppDateString(w.to) });

  const base: ChangeBreakdown = {
    kind,
    currentPeriod: days(current.window),
    previousPeriod: previous ? days(previous.window) : null,
    currentTotal: cur.totalCents / 100,
    previousTotal: prev ? prev.totalCents / 100 : null,
    unavailableReason: null,
    totalChange: null,
    totalChangePct: null,
    sharesHiddenReason: null,
    mixedDirections: false,
    categoriesLookLikeFreeText: looksLikeFreeText(
      [...current.transactions, ...(previous?.transactions ?? [])],
      kind,
    ),
    categories: [],
  };

  if (!prev) return { ...base, unavailableReason: 'CUSTOM_PERIOD' };
  if (prev.count === 0) return { ...base, unavailableReason: 'NO_PREVIOUS_DATA' };
  if (cur.count === 0) return { ...base, unavailableReason: 'NO_CURRENT_DATA' };

  const totalChangeCents = cur.totalCents - prev.totalCents;
  const keys = new Set([...cur.byKey.keys(), ...prev.byKey.keys()]);
  const rows = [...keys].map((key) => {
    const c = cur.byKey.get(key);
    const p = prev.byKey.get(key);
    const entry = (c ?? p)!;
    const currentCents = c?.cents ?? 0;
    const previousCents = p?.cents ?? 0;
    return {
      category: entry.category,
      uncategorized: entry.uncategorized,
      currentCents,
      previousCents,
      changeCents: currentCents - previousCents,
      presence: (c && p ? 'both' : c ? 'new' : 'gone') as CategoryChange['presence'],
    };
  });

  const grossCents = rows.reduce((s, r) => s + Math.abs(r.changeCents), 0);
  const larger = Math.max(cur.totalCents, prev.totalCents);
  const sharesHiddenReason: SharesHiddenReason | null =
    Math.abs(totalChangeCents) < larger * NEGLIGIBLE_CHANGE_RATIO
      ? 'NEGLIGIBLE_TOTAL_CHANGE'
      : Math.abs(totalChangeCents) < grossCents * MIN_NET_TO_GROSS_RATIO
        ? 'OFFSETTING_CHANGES'
        : null;

  const categories: CategoryChange[] = rows
    .sort((a, b) => Math.abs(b.changeCents) - Math.abs(a.changeCents) || a.category.localeCompare(b.category))
    .map((r) => ({
      category: r.category,
      uncategorized: r.uncategorized,
      previous: r.previousCents / 100,
      current: r.currentCents / 100,
      change: r.changeCents / 100,
      share: sharesHiddenReason === null ? (r.changeCents / totalChangeCents) * 100 : null,
      presence: r.presence,
    }));

  return {
    ...base,
    totalChange: totalChangeCents / 100,
    totalChangePct: (totalChangeCents / prev.totalCents) * 100,
    sharesHiddenReason,
    mixedDirections: rows.some((r) => r.changeCents > 0) && rows.some((r) => r.changeCents < 0),
    categories,
  };
}

/**
 * changeBreakdown for a named period against its comparison period, built
 * with the same rule as the finance page's period badges: the window shifted
 * back by the period's own length through comparisonWindow (day-and-hour
 * parity). `transactions` is the organization's WHOLE history; the two
 * windows are cut out of it here.
 */
export function periodChangeBreakdown(
  transactions: DemoTransaction[],
  kind: 'REVENUE' | 'COST',
  period: '1m' | '3m' | '6m' | '12m' | 'custom',
  customFrom?: string,
  customTo?: string,
): ChangeBreakdown {
  const window = periodWindow(period, customFrom, customTo);
  const months = periodMonths(period);
  const previousWindow = months === null ? null : comparisonWindow(window, months);
  return changeBreakdown({
    kind,
    current: { window, transactions: filterTransactionsByWindow(transactions, window) },
    previous: previousWindow
      ? { window: previousWindow, transactions: filterTransactionsByWindow(transactions, previousWindow) }
      : null,
  });
}
