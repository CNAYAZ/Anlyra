import type { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/response';
import { getOrgData, listQuerySchema } from '@/lib/api/financial-query';
import {
  categoryBreakdown,
  computeKpis,
  filterTransactionsByPeriod,
  monthlySeries,
  periodTotals,
  safeDiv,
} from '@/lib/analysis/financial';

export async function GET(req: NextRequest) {
  try {
    const parsed = listQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!parsed.success) return fail(parsed.error.message, 422);
    const { period, from, to, category, page, pageSize, sortBy, sortOrder } = parsed.data;

    const data = await getOrgData();
    // Period-filtered but BOTH kinds — computeKpis needs revenue too (for
    // totalRevenue, used by ratio below). `filtered` (costs only) is derived
    // from it for everything specifically about costs.
    const periodTransactions = filterTransactionsByPeriod(data.transactions, period, from, to);
    const filtered = periodTransactions.filter((t) => t.kind === 'COST');
    const inCategory = category ? filtered.filter((t) => t.category === category) : filtered;

    const sorted = [...inCategory].sort((a, b) => {
      const dir = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'amount') return (a.amount - b.amount) * dir;
      if (sortBy === 'category') return a.category.localeCompare(b.category) * dir;
      return (a.date.getTime() - b.date.getTime()) * dir;
    });

    const total = sorted.length;
    const start = (page - 1) * pageSize;
    const items = sorted.slice(start, start + pageSize);

    // Previously built from data.transactions/data.cashflow (the org's full,
    // unfiltered history) regardless of the requested period — the same bug
    // fixed in the main /api/analysis/financial route.
    //
    // Only `burnRate` is read out of computeKpis now — the ratio below builds
    // both of its sides from periodTotals instead. No `comparison` is passed:
    // computeKpis needs one supplied by the caller to compute
    // momRevenueGrowth/momCostGrowth/momNetMarginDelta/momMrrDelta/
    // momCustomersDelta (see the main route), and this route shows none of
    // them. Without `comparison` those five fields simply come back null,
    // which is correct here: nothing displays them.
    //
    // burnRate is deliberately NOT a period figure: it is the average monthly
    // cost of the last three months inside the window ("Costi medi mensili"),
    // which is what its label says and what isBurningCash is built on.
    const kpis = computeKpis({
      transactions: periodTransactions,
      cashflow: filterTransactionsByPeriod(data.cashflow, period, from, to),
      customers: data.customers,
      subscriptions: data.subscriptions,
    });
    const totalCosts = filtered.reduce((s, t) => s + t.amount, 0);
    // Both sides of the ratio are the WHOLE selected period. They used to be
    // kpis.totalCosts/kpis.totalRevenue — the latest month alone — so the
    // "costs / revenue" percentage described September while the "total costs"
    // card next to it described the twelve months the filter was set to, and
    // the percentage did not move when the filter did.
    // null instead of 0 when the period has no revenue to divide by — a
    // fallback 0% here would claim "costs are 0% of revenue" when the ratio
    // was never actually derivable.
    const totals = periodTotals(periodTransactions);
    const rawRatio = safeDiv(totals.costs, totals.revenue);
    const ratio = rawRatio === null ? null : rawRatio * 100;

    return ok({
      kpis: { totalCosts, burnRate: kpis.burnRate, ratio },
      series: monthlySeries(periodTransactions),
      byCategory: categoryBreakdown(filtered, 'COST'),
      // Left unfiltered on purpose: this feeds the category filter dropdown,
      // not a displayed total — same reasoning as the /revenue route.
      categories: Array.from(new Set(data.transactions.filter((t) => t.kind === 'COST').map((t) => t.category))),
      items,
      pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return fail(message === 'Unauthorized' ? 'Unauthorized' : 'Internal error', message === 'Unauthorized' ? 401 : 500);
  }
}
