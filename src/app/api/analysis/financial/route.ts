import type { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/response';
import { financialQuerySchema, getOrgData } from '@/lib/api/financial-query';
import {
  categoryBreakdown,
  comparePeriodTotals,
  comparisonWindow,
  computeKpis,
  cumulativeCashflow,
  filterTransactionsByWindow,
  monthlySeries,
  periodMonths,
  periodTotals,
  periodWindow,
} from '@/lib/analysis/financial';

export async function GET(req: NextRequest) {
  try {
    const parsed = financialQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!parsed.success) return fail(parsed.error.message, 422);

    const data = await getOrgData();
    const window = periodWindow(parsed.data.period, parsed.data.from, parsed.data.to);
    const filtered = filterTransactionsByWindow(data.transactions, window);
    const filteredCashflow = filterTransactionsByWindow(data.cashflow, window);

    // Everything below is built from the SAME filtered set: previously kpis
    // and series were computed from the org's full, unfiltered history
    // regardless of the period the caller asked for, while only the two
    // category breakdowns respected it — the total on the page and the chart
    // next to it could disagree, and the period selector looked broken.
    // customers is left unfiltered on purpose: it is a snapshot ("current
    // active customers"), not a date-ranged transaction log, and its only
    // consumer (the custom-dashboards kpi_customers widget) wants the latest
    // snapshot regardless of period, same as before this fix.
    //
    // The mom/delta figures inside `kpis` (momRevenueGrowth, momCostGrowth,
    // momNetMarginDelta, momMrrDelta, momCustomersDelta) need a comparison
    // period too — computeKpis no longer derives one on its own (it used to
    // read series.at(-2)/customers.at(-2), i.e. "whatever calendar-month
    // bucket happened to be adjacent", not a day-parity match for a partial
    // current month: on Overview/Finance this meant a handful of days in
    // September compared against the whole of August). Always a 1-month
    // shift, regardless of the overall period selected (1m/3m/6m/12m) —
    // these are month-over-month figures, not "whole period vs whole prior
    // period" ones, the same rule finance/revenue/page.tsx's mom already
    // applies (fc83e9e). The two windows deliberately overlap for any period
    // longer than 1m; that is harmless because computeKpis reads ONE NAMED
    // MONTH out of each of them (addressed by key), never the window total.
    const compWindow = comparisonWindow(window, 1);
    const compMonthKey = `${compWindow.to.getFullYear()}-${String(compWindow.to.getMonth() + 1).padStart(2, '0')}`;
    const kpis = computeKpis({
      transactions: filtered,
      cashflow: filteredCashflow,
      customers: data.customers,
      subscriptions: data.subscriptions,
      comparison: {
        transactions: filterTransactionsByWindow(data.transactions, compWindow),
        // CustomerStat is a monthly snapshot (period "YYYY-MM"), not a
        // date-ranged log, so there is no day-parity slice to take from it —
        // every record up to and including the comparison month is passed,
        // and computeKpis picks the latest one the same way it already does
        // for the current period's customers.
        customers: data.customers.filter((c) => c.period <= compMonthKey),
        asOf: compWindow.to,
        // Names the CURRENT month for computeKpis, so it addresses that
        // month's bucket by key instead of taking "the last bucket that
        // exists" — which for an org with no movements in the first days of
        // the comparison month meant comparing against a month further back
        // still (verified on fixture: a doubling shown as -74%).
        currentAsOf: window.to,
      },
    });

    // Totals for the WHOLE selected period, plus the equivalent period before
    // it. The finance page carries a PeriodFilter, but its Ricavi/Costi cards
    // read kpis.totalRevenue/totalCosts — the latest month alone — so they did
    // not move when the customer moved the filter, and the three margins next
    // to them described that same single month. `kpis` is untouched: the
    // Overview has no filter, shows the latest month on purpose, and its mom*
    // badges are built on it.
    //
    // The comparison shifts the window back by the period's OWN length (3
    // months for "3 months", 12 for "12 months"), not by one month: a total
    // that speaks of a year cannot carry a badge that speaks of September.
    // comparisonWindow keeps the day-and-hour parity rule from 98ad8b5, so
    // the partial current month is held against an equally partial one.
    const months = periodMonths(parsed.data.period);
    const previousWindow = months === null ? null : comparisonWindow(window, months);
    const totals = periodTotals(filtered);
    const previousTotals = previousWindow
      ? periodTotals(filterTransactionsByWindow(data.transactions, previousWindow))
      : null;

    return ok({
      kpis,
      periodKpis: { ...totals, ...comparePeriodTotals(totals, previousTotals) },
      series: monthlySeries(filtered),
      revenueByCategory: categoryBreakdown(filtered, 'REVENUE'),
      costsByCategory: categoryBreakdown(filtered, 'COST'),
      cumulativeCash: cumulativeCashflow(filteredCashflow),
      insights: data.insights,
      customers: data.customers,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return fail(message === 'Unauthorized' ? 'Unauthorized' : 'Internal error', message === 'Unauthorized' ? 401 : 500);
  }
}
