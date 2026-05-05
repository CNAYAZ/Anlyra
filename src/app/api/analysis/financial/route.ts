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

    const kpis = computeKpis({
      transactions: data.transactions,
      cashflow: data.cashflow,
      customers: data.customers,
      subscriptions: data.subscriptions,
    });

    return ok({
      kpis,
      series: monthlySeries(data.transactions),
      revenueByCategory: categoryBreakdown(filtered, 'REVENUE'),
      costsByCategory: categoryBreakdown(filtered, 'COST'),
      cumulativeCash: cumulativeCashflow(data.cashflow),
      insights: data.insights,
      customers: data.customers,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return fail(message === 'Unauthorized' ? 'Unauthorized' : 'Internal error', message === 'Unauthorized' ? 401 : 500);
  }
}
