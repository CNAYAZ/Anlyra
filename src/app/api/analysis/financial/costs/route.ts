import type { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/response';
import { getOrgData, listQuerySchema } from '@/lib/api/financial-query';
import {
  categoryBreakdown,
  computeKpis,
  filterTransactionsByPeriod,
  monthlySeries,
} from '@/lib/analysis/financial';

export async function GET(req: NextRequest) {
  try {
    const parsed = listQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!parsed.success) return fail(parsed.error.message, 422);
    const { period, from, to, category, page, pageSize, sortBy, sortOrder } = parsed.data;

    const data = getOrgData();
    const filtered = filterTransactionsByPeriod(data.transactions, period, from, to).filter((t) => t.kind === 'COST');
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

    const kpis = computeKpis({
      transactions: data.transactions,
      cashflow: data.cashflow,
      customers: data.customers,
      subscriptions: data.subscriptions,
    });
    const totalCosts = filtered.reduce((s, t) => s + t.amount, 0);
    const ratio = kpis.totalRevenue > 0 ? (kpis.totalCosts / kpis.totalRevenue) * 100 : 0;

    return ok({
      kpis: { totalCosts, burnRate: kpis.burnRate, ratio },
      series: monthlySeries(data.transactions),
      byCategory: categoryBreakdown(filtered, 'COST'),
      categories: Array.from(new Set(data.transactions.filter((t) => t.kind === 'COST').map((t) => t.category))),
      items,
      pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return fail(message === 'Unauthorized' ? 'Unauthorized' : 'Internal error', message === 'Unauthorized' ? 401 : 500);
  }
}
