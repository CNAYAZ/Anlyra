import { NextRequest } from 'next/server';
import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentContext } from '@/lib/session';
import {
  buildForecast,
  computeForecastSummary,
  confidenceInterval,
} from '@/lib/forecasting';

export const dynamic = 'force-dynamic';

type Metric = 'revenue' | 'costs' | 'margin';
type Model = 'linear' | 'moving_avg' | 'exponential';

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function addMonths(d: Date, n: number) {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

export async function GET(req: NextRequest) {
  try {
    const { organizationId } = await getCurrentContext();
    const sp = req.nextUrl.searchParams;

    const metric = (sp.get('metric') ?? 'revenue') as Metric;
    const horizon = Math.min(12, Math.max(1, parseInt(sp.get('horizon') ?? '6', 10)));
    const model = (sp.get('model') ?? 'exponential') as Model;

    if (!['revenue', 'costs', 'margin'].includes(metric)) return fail('INVALID_METRIC', 400);
    if (!['linear', 'moving_avg', 'exponential'].includes(model)) return fail('INVALID_MODEL', 400);

    // Pull at least 24 months of financial records
    const since = addMonths(new Date(), -24);
    const records = await prisma.financialRecord.findMany({
      where: { organizationId, occurredAt: { gte: since } },
      orderBy: { occurredAt: 'asc' },
    });

    if (records.length === 0) {
      return ok({ historical: [], forecast: [], summary: null, insufficientData: true });
    }

    // Aggregate by month
    const monthly = new Map<string, { revenue: number; costs: number }>();
    for (const r of records) {
      const k = monthKey(r.occurredAt);
      const cur = monthly.get(k) ?? { revenue: 0, costs: 0 };
      if (r.type === 'REVENUE') cur.revenue += r.amount;
      else cur.costs += r.amount;
      monthly.set(k, cur);
    }

    const sortedMonths = [...monthly.keys()].sort();
    if (sortedMonths.length < 3) {
      return ok({ historical: [], forecast: [], summary: null, insufficientData: true });
    }

    const historical = sortedMonths.map((mo) => {
      const { revenue, costs } = monthly.get(mo)!;
      const value =
        metric === 'revenue' ? revenue :
        metric === 'costs' ? costs :
        revenue - costs; // margin
      return { month: mo, value: Math.max(0, value) };
    });

    const histValues = historical.map((h) => h.value);
    const { projected } = buildForecast(histValues, horizon, model);

    if (projected.length === 0) {
      return ok({ historical, forecast: [], summary: null, insufficientData: true });
    }

    const { lower, upper } = confidenceInterval(histValues, projected);

    // Generate future month keys
    const lastMonth = sortedMonths[sortedMonths.length - 1];
    const [y, m] = lastMonth.split('-').map(Number);
    const forecastBase = new Date(y, m - 1, 1);

    const forecast = projected.map((value, i) => {
      const d = addMonths(forecastBase, i + 1);
      return {
        month: monthKey(d),
        value: Math.max(0, value),
        lower: Math.max(0, lower[i]),
        upper: Math.max(0, upper[i]),
      };
    });

    const summary = computeForecastSummary(histValues, projected, model);

    return ok({ historical, forecast, summary, insufficientData: false });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
