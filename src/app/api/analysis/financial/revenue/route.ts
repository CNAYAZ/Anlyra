import type { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/response';
import { getOrgData, listQuerySchema } from '@/lib/api/financial-query';
import {
  categoryBreakdown,
  filterTransactionsByPeriod,
  monthlySeries,
  safeDiv,
  yoyGrowth,
} from '@/lib/analysis/financial';

export async function GET(req: NextRequest) {
  try {
    const parsed = listQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!parsed.success) return fail(parsed.error.message, 422);
    const { period, from, to, category, page, pageSize, sortBy, sortOrder } = parsed.data;

    const data = await getOrgData();
    // Period-filtered but BOTH kinds, so the trend/mom/yoy figures below see
    // costs too where they need them — `filtered` (revenue only) is derived
    // from it for everything that is specifically about revenue.
    const periodTransactions = filterTransactionsByPeriod(data.transactions, period, from, to);
    const filtered = periodTransactions.filter((t) => t.kind === 'REVENUE');
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

    // Previously built from data.transactions (the org's full, unfiltered
    // history) regardless of the requested period — the same bug fixed in
    // the main /api/analysis/financial route.
    const series = monthlySeries(periodTransactions);
    const last = series.at(-1);
    const prev = series.at(-2);
    const totalRevenue = filtered.reduce((s, t) => s + t.amount, 0);
    // null instead of 0 when there is no previous period, or its revenue was
    // <= 0 — a fallback 0% here would claim "no change" when the comparison
    // was never actually possible. Same rule as momRevenueGrowth in
    // computeKpis (lib/analysis/financial.ts), applied by hand here since
    // this route computes mom itself rather than calling computeKpis.
    const rawMom = prev ? safeDiv(last!.revenue - prev.revenue, prev.revenue) : null;
    const mom = rawMom === null ? null : rawMom * 100;
    const yoy = yoyGrowth(series);
    const activeCustomers = data.customers.at(-1)?.activeCustomers ?? 0;
    // null instead of Math.max(1, 0)-then-divide when there are no active
    // customers: the old code produced a real-looking ARPU number (equal to
    // last month's revenue) instead of admitting the figure has no
    // denominator to be an average OF anything.
    const arpu = last ? safeDiv(last.revenue, activeCustomers) : null;

    return ok({
      kpis: { totalRevenue, mom, yoy, arpu },
      series,
      byCategory: categoryBreakdown(filtered, 'REVENUE'),
      // Left unfiltered on purpose: this feeds the category filter dropdown,
      // not a displayed total — a category from outside the selected window
      // should still be selectable, same as before this fix.
      categories: Array.from(new Set(data.transactions.filter((t) => t.kind === 'REVENUE').map((t) => t.category))),
      items,
      pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return fail(message === 'Unauthorized' ? 'Unauthorized' : 'Internal error', message === 'Unauthorized' ? 401 : 500);
  }
}
