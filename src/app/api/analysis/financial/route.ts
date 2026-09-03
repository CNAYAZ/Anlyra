import type { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/response';
import { financialQuerySchema, getOrgData } from '@/lib/api/financial-query';
import {
  categoryBreakdown,
  computeKpis,
  cumulativeCashflow,
  filterTransactionsByPeriod,
  monthlySeries,
} from '@/lib/analysis/financial';

export async function GET(req: NextRequest) {
  try {
    const parsed = financialQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!parsed.success) return fail(parsed.error.message, 422);

    const data = await getOrgData();
    const filtered = filterTransactionsByPeriod(data.transactions, parsed.data.period, parsed.data.from, parsed.data.to);
    const filteredCashflow = filterTransactionsByPeriod(data.cashflow, parsed.data.period, parsed.data.from, parsed.data.to);

    // Everything below is built from the SAME filtered set: previously kpis
    // and series were computed from the org's full, unfiltered history
    // regardless of the period the caller asked for, while only the two
    // category breakdowns respected it — the total on the page and the chart
    // next to it could disagree, and the period selector looked broken.
    // customers is left unfiltered on purpose: it is a snapshot ("current
    // active customers"), not a date-ranged transaction log, and its only
    // consumer (the custom-dashboards kpi_customers widget) wants the latest
    // snapshot regardless of period, same as before this fix.
    const kpis = computeKpis({
      transactions: filtered,
      cashflow: filteredCashflow,
      customers: data.customers,
      subscriptions: data.subscriptions,
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
