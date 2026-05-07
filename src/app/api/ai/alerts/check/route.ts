import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentContext } from '@/lib/session';

export const dynamic = 'force-dynamic';

const METRIC_LABEL: Record<string, string> = {
  churn_rate: 'Churn rate',
  cash_runway_months: 'Cash runway',
  revenue_mom_pct: 'Variazione ricavi MoM',
  cost_mom_pct: 'Variazione costi MoM',
  nps: 'NPS',
};

function evaluate(comparator: string, value: number, threshold: number): boolean {
  if (comparator === 'gt') return value > threshold;
  if (comparator === 'lt') return value < threshold;
  return Math.abs(value - threshold) < 0.0001;
}

async function computeMetrics(organizationId: string) {
  const [kpis, records] = await Promise.all([
    prisma.kPI.findMany({ where: { organizationId } }),
    prisma.financialRecord.findMany({ where: { organizationId }, orderBy: { occurredAt: 'asc' } }),
  ]);

  const find = (s: string) => kpis.find((k) => k.name.toLowerCase().includes(s));

  // Group by month
  const monthly = new Map<string, { revenue: number; cost: number }>();
  for (const r of records) {
    const k = `${r.occurredAt.getFullYear()}-${String(r.occurredAt.getMonth() + 1).padStart(2, '0')}`;
    const cur = monthly.get(k) ?? { revenue: 0, cost: 0 };
    if (r.type === 'REVENUE') cur.revenue += r.amount;
    else cur.cost += r.amount;
    monthly.set(k, cur);
  }
  const sorted = Array.from(monthly.entries()).sort();
  const last = sorted[sorted.length - 1]?.[1];
  const prev = sorted[sorted.length - 2]?.[1];

  const revMom = last && prev && prev.revenue > 0 ? ((last.revenue - prev.revenue) / prev.revenue) * 100 : 0;
  const costMom = last && prev && prev.cost > 0 ? ((last.cost - prev.cost) / prev.cost) * 100 : 0;

  // Approx cash runway: assume cash buffer = total revenue - total cost over period
  const totalRev = records.filter((r) => r.type === 'REVENUE').reduce((s, r) => s + r.amount, 0);
  const totalCost = records.filter((r) => r.type === 'COST').reduce((s, r) => s + r.amount, 0);
  const buffer = Math.max(0, totalRev - totalCost);
  const burn = last ? Math.max(1, last.cost - last.revenue) : 1;
  const runway = burn > 0 ? buffer / Math.max(1, burn) : 99;

  return {
    churn_rate: find('churn')?.value ?? 0,
    cash_runway_months: runway,
    revenue_mom_pct: revMom,
    cost_mom_pct: costMom,
    nps: find('nps')?.value ?? 0,
  } as Record<string, number>;
}

export async function POST() {
  try {
    const { organizationId } = await getCurrentContext();
    const configs = await prisma.aiAlertConfig.findMany({
      where: { organizationId, enabled: true },
    });
    const metrics = await computeMetrics(organizationId);
    const created: { metric: string; title: string }[] = [];

    for (const c of configs) {
      const value = metrics[c.metric] ?? 0;
      if (!evaluate(c.comparator, value, c.threshold)) continue;

      // Avoid duplicating same alert from last 24h
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const existing = await prisma.aiAlert.findFirst({
        where: { organizationId, metric: c.metric, createdAt: { gte: since } },
      });
      if (existing) continue;

      const label = METRIC_LABEL[c.metric] ?? c.metric;
      const severity = c.metric === 'cash_runway_months' || c.metric === 'churn_rate' ? 'HIGH' : 'MEDIUM';
      const title = `${label}: soglia superata`;
      const message =
        c.comparator === 'gt'
          ? `${label} a ${value.toFixed(2)} (soglia ${c.threshold.toFixed(2)}).`
          : c.comparator === 'lt'
            ? `${label} a ${value.toFixed(2)} (soglia minima ${c.threshold.toFixed(2)}).`
            : `${label} a ${value.toFixed(2)}.`;

      await prisma.aiAlert.create({
        data: {
          organizationId,
          type: 'finance',
          severity,
          metric: c.metric,
          title,
          message,
          thresholdValue: c.threshold,
          currentValue: value,
        },
      });
      created.push({ metric: c.metric, title });
    }

    return ok({ created, checked: configs.length, metrics });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
