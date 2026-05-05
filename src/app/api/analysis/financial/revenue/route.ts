import type { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/response';
import { getOrgData, listQuerySchema } from '@/lib/api/financial-query';
import {
  categoryBreakdown,
  filterTransactionsByPeriod,
  monthlySeries,
  yoyGrowth,
} from '@/lib/analysis/financial';

export async function GET(req: NextRequest) {
  try {
    const parsed = listQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!parsed.success) return fail(parsed.error.message, 422);
    const { period, from, to, category, page, pageSize, sortBy, sortOrder } = parsed.data;

    const data = await getOrgData();
    const filtered = filterTransactionsByPeriod(data.transactions, period, from, to).filter((t) => t.kind === 'REVENUE');
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

    const series = monthlySeries(data.transactions);
    const last = series.at(-1);
    const prev = series.at(-2);
    const totalRevenue = filtered.reduce((s, t) => s + t.amount, 0);
    const mom = prev && last ? ((last.revenue - prev.revenue) / prev.revenue) * 100 : 0;
    const yoy = yoyGrowth(series);
    const activeCustomers = data.customers.at(-1)?.activeCustomers ?? 1;
    const arpu = (last?.revenue ?? 0) / Math.max(1, activeCustomers);

    return ok({
      kpis: { totalRevenue, mom, yoy, arpu },
      series,
      byCategory: categoryBreakdown(filtered, 'REVENUE'),
      categories: Array.from(new Set(data.transactions.filter((t) => t.kind === 'REVENUE').map((t) => t.category))),
      items,
      pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return fail(message === 'Unauthorized' ? 'Unauthorized' : 'Internal error', message === 'Unauthorized' ? 401 : 500);
  }
}
