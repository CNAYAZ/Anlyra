import type { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/response';
import { financialQuerySchema, getOrgData } from '@/lib/api/financial-query';
import { cashflowByCategory, computeKpis, cumulativeCashflow } from '@/lib/analysis/financial';

export async function GET(req: NextRequest) {
  try {
    const parsed = financialQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!parsed.success) return fail(parsed.error.message, 422);

    const data = await getOrgData();
    const kpis = computeKpis({
      transactions: data.transactions,
      cashflow: data.cashflow,
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
      monthly: cumulativeCashflow(data.cashflow),
      byCategory: cashflowByCategory(data.cashflow),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return fail(message === 'Unauthorized' ? 'Unauthorized' : 'Internal error', message === 'Unauthorized' ? 401 : 500);
  }
}
