import type { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/response';
import { getOrgData, listQuerySchema } from '@/lib/api/financial-query';
import {
  categoryBreakdown,
  comparisonWindow,
  filterTransactionsByWindow,
  monthlySeries,
  periodWindow,
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
    const window = periodWindow(period, from, to);
    const periodTransactions = filterTransactionsByWindow(data.transactions, window);
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
    const totalRevenue = filtered.reduce((s, t) => s + t.amount, 0);

    // mom: the SAME day-count window exactly one month earlier — not the
    // whole previous calendar month (series.at(-2)), which would compare a
    // handful of days in the current month against a full prior month
    // whenever the current one is still in progress (it always is: "last"
    // is always the current, possibly-partial month, see periodWindow).
    const momWindow = comparisonWindow(window, 1);
    const momRevenue = filterTransactionsByWindow(data.transactions, momWindow)
      .filter((t) => t.kind === 'REVENUE')
      .reduce((s, t) => s + t.amount, 0);
    const rawMom = last ? safeDiv(last.revenue - momRevenue, momRevenue) : null;
    const mom = rawMom === null ? null : rawMom * 100;

    // yoy: same day-parity idea twelve months back. Built as the union of
    // the primary window's revenue with that comparison window's, so the
    // already-fixed yoyGrowth() (financial.ts) does the same "same period
    // key" lookup it already does — never sent to the client as `series`,
    // which stays exactly the selected period (see the trend chart on
    // finance/revenue/page.tsx).
    const yoyWindow = comparisonWindow(window, 12);
    const yoyComparisonRevenue = filterTransactionsByWindow(data.transactions, yoyWindow).filter((t) => t.kind === 'REVENUE');
    const yoy = yoyGrowth(monthlySeries([...filtered, ...yoyComparisonRevenue]));

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
