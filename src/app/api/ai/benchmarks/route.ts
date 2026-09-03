import { NextRequest } from 'next/server';
import { ok, fail, failFromError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentContext } from '@/lib/session';
import {
  ALL_METRICS,
  ALL_INDUSTRIES,
  ALL_SIZES,
  METRIC_UNITS,
  getBenchmark,
  statusFor,
  type IndustryKey,
  type SizeKey,
  type MetricKey,
  type BenchmarkStatus,
} from '@/lib/benchmarks-data';

export const dynamic = 'force-dynamic';

type MetricResult = {
  key: MetricKey;
  companyValue: number | null;
  p25: number;
  p50: number;
  p75: number;
  unit: 'percent' | 'months' | 'ratio' | 'score';
  status: BenchmarkStatus | null;
};

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function addMonths(d: Date, n: number) {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

async function computeCompanyMetrics(organizationId: string): Promise<Partial<Record<MetricKey, number>>> {
  const since = addMonths(new Date(), -6);
  const [kpis, records, customerStats] = await Promise.all([
    prisma.kPI.findMany({ where: { organizationId } }),
    prisma.financialRecord.findMany({ where: { organizationId, occurredAt: { gte: since } } }),
    prisma.customerStat.findMany({ where: { organizationId }, orderBy: { period: 'desc' }, take: 6 }),
  ]);

  const result: Partial<Record<MetricKey, number>> = {};

  // Helper: find KPI by partial name match
  const findKpi = (needle: string) =>
    kpis.find((k) => k.name.toLowerCase().includes(needle.toLowerCase()))?.value;

  // churnRate: from CustomerStat (latest period) or KPI fallback
  const latestStat = customerStats[0];
  if (latestStat && latestStat.activeCustomers + latestStat.churnedCustomers > 0) {
    const churn = (latestStat.churnedCustomers / (latestStat.activeCustomers + latestStat.churnedCustomers)) * 100;
    result.churnRate = Math.round(churn * 10) / 10;
  } else {
    const k = findKpi('churn');
    if (k !== undefined) result.churnRate = k;
  }

  // nps
  const nps = findKpi('nps');
  if (nps !== undefined) result.nps = nps;

  // conversion
  const conv = findKpi('conversion');
  if (conv !== undefined) result.conversionRate = conv;

  // grossMargin: from FinancialRecord
  const rev = records.filter((r) => r.type === 'REVENUE').reduce((s, r) => s + r.amount, 0);
  const cost = records.filter((r) => r.type !== 'REVENUE').reduce((s, r) => s + r.amount, 0);
  if (rev > 0) {
    result.grossMargin = Math.round(((rev - cost) / rev) * 1000) / 10;
  }

  // cacPayback (from KPI if available)
  const cacP = findKpi('cac payback') ?? findKpi('cac_payback') ?? findKpi('payback');
  if (cacP !== undefined) result.cacPayback = cacP;

  // ltvCacRatio (from KPI if available)
  const ltvCac = findKpi('ltv') ?? findKpi('ltv_cac');
  if (ltvCac !== undefined) result.ltvCacRatio = ltvCac;

  // mrrGrowthRate: month-over-month revenue growth
  const monthly = new Map<string, number>();
  for (const r of records) {
    if (r.type !== 'REVENUE') continue;
    const k = monthKey(r.occurredAt);
    monthly.set(k, (monthly.get(k) ?? 0) + r.amount);
  }
  const sorted = [...monthly.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  if (sorted.length >= 2) {
    const last = sorted[sorted.length - 1][1];
    const prev = sorted[sorted.length - 2][1];
    if (prev > 0) {
      result.mrrGrowthRate = Math.round(((last - prev) / prev) * 1000) / 10;
    }
  }

  // netDollarRetention: from KPI fallback
  const ndr = findKpi('ndr') ?? findKpi('net dollar') ?? findKpi('retention');
  if (ndr !== undefined) result.netDollarRetention = ndr;

  return result;
}

export async function GET(req: NextRequest) {
  try {
    const { organizationId } = await getCurrentContext();
    const sp = req.nextUrl.searchParams;

    const industry = (sp.get('industry') ?? 'saas-b2b') as IndustryKey;
    const size = (sp.get('size') ?? 'growth') as SizeKey;

    if (!ALL_INDUSTRIES.includes(industry)) return fail('INVALID_INDUSTRY', 400);
    if (!ALL_SIZES.includes(size)) return fail('INVALID_SIZE', 400);

    const benchmark = getBenchmark(industry, size);
    const company = await computeCompanyMetrics(organizationId);

    const metrics: MetricResult[] = ALL_METRICS.map((key) => {
      const p = benchmark[key];
      const value = company[key];
      return {
        key,
        companyValue: value ?? null,
        p25: p.p25,
        p50: p.p50,
        p75: p.p75,
        unit: METRIC_UNITS[key],
        status: value !== undefined ? statusFor(key, value, p) : null,
      };
    });

    return ok({ industry, size, metrics });
  } catch (e) {
    return failFromError(e);
  }
}
