import type { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/response';
import { financialQuerySchema, getOrgData } from '@/lib/api/financial-query';
import {
  categoryBreakdown,
  comparisonWindow,
  computeKpis,
  cumulativeCashflow,
  filterTransactionsByWindow,
  monthlySeries,
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
    // applies (fc83e9e).
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
      },
    });

    return ok({
      kpis,
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
