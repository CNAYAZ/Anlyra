import type { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/response';
import { financialQuerySchema, getOrgData } from '@/lib/api/financial-query';
import {
  cashflowByCategory,
  computeKpis,
  cumulativeCashflow,
  filterTransactionsByPeriod,
} from '@/lib/analysis/financial';

export async function GET(req: NextRequest) {
  try {
    const parsed = financialQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!parsed.success) return fail(parsed.error.message, 422);

    // The page (finance/cashflow/page.tsx) has always sent period/from/to —
    // this route validated them and then never read parsed.data, so every
    // number here reflected the org's full, unfiltered history no matter
    // which period the visible PeriodFilter control was set to.
    const { period, from, to } = parsed.data;
    const data = await getOrgData();
    const periodTransactions = filterTransactionsByPeriod(data.transactions, period, from, to);
    const filteredCashflow = filterTransactionsByPeriod(data.cashflow, period, from, to);
    // No `comparison` is passed: computeKpis needs one supplied by the caller
    // to compute momRevenueGrowth/momCostGrowth/momNetMarginDelta/
    // momMrrDelta/momCustomersDelta (see the main /api/analysis/financial
    // route), but none of those are among the fields this route exposes
    // below (operating/available/workingCapital/runway/isBurningCash are all
    // "as of the current period", not comparisons) — they simply come back
    // null, which is correct here since nothing reads them.
    const kpis = computeKpis({
      transactions: periodTransactions,
      cashflow: filteredCashflow,
      customers: data.customers,
      subscriptions: data.subscriptions,
    });

    return ok({
      kpis: {
        operating: kpis.totalRevenue - kpis.totalCosts,
        available: kpis.cashAvailable,
        workingCapital: kpis.workingCapital,
        runway: kpis.cashRunway,
        isBurningCash: kpis.isBurningCash,
      },
      monthly: cumulativeCashflow(filteredCashflow),
      byCategory: cashflowByCategory(filteredCashflow),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return fail(message === 'Unauthorized' ? 'Unauthorized' : 'Internal error', message === 'Unauthorized' ? 401 : 500);
  }
}
