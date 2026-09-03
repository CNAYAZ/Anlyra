import { prisma } from '@/lib/prisma';
import { getOrgData } from '@/lib/api/financial-query';
import { getFinancialFacts } from '@/lib/facts/financial-facts';
import { toAppDateString } from '@/lib/timezone';
import type { ReportPayload } from './sample-data';
import type { ReportConfig, ReportSection } from './types';

/**
 * Builds the PDF payload from an organization's REAL data — the replacement for
 * buildSamplePayload, which returned invented numbers.
 *
 * Contract: never fabricate. Every figure below is computed from rows that exist
 * (FinancialRecord via getOrgData, CashflowEntry, the rule-based facts engine,
 * Organization). A section whose numbers are NOT derivable from real data is
 * dropped from `sections` instead of being filled with plausible-looking values,
 * so the PDF can come out shorter than requested — and that is the honest result.
 *
 * Sections that are ALWAYS dropped, with the reason:
 *   • market      — market share and competitor shares exist nowhere in the DB
 *                   (Competitor_b7 holds seed-only synthetic rows).
 *   • operations  — productivity/efficiency/issues come from the synthetic
 *                   engines flagged in CLAUDE.md §9.
 *   • benchmark   — needs industry averages; the app only has a static table.
 */
export async function buildRealPayload(
  organizationId: string,
  config: ReportConfig,
): Promise<{ payload: ReportPayload; sections: ReportSection[] } | null> {
  const [data, facts, org] = await Promise.all([
    getOrgData(organizationId),
    // The report already carries the language the user picked in the builder;
    // the facts that become the "Recommendations" section must be written in it
    // (they used to be hard-coded Italian inside an otherwise English PDF).
    getFinancialFacts(organizationId, config.language),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, industry: true, country: true, employees: true },
    }),
  ]);
  if (!org) return null;

  const monthsBack: Record<string, number> = { '1m': 1, '3m': 3, '6m': 6, '12m': 12, custom: 12 };
  const months = monthsBack[config.period] ?? 12;

  const to = config.customPeriodTo ? new Date(config.customPeriodTo) : new Date();
  const from = config.customPeriodFrom
    ? new Date(config.customPeriodFrom)
    : (() => {
        const d = new Date(to);
        d.setMonth(d.getMonth() - months);
        return d;
      })();

  const inPeriod = data.transactions.filter((t) => t.date >= from && t.date <= to);
  // A report over a window with no transactions has nothing real to say.
  if (inPeriod.length === 0) return null;

  // ── Monthly aggregation (real revenue/costs per calendar month, Europe/Rome) ──
  const byMonth = new Map<string, { revenue: number; costs: number }>();
  for (const t of inPeriod) {
    const key = toAppDateString(t.date).slice(0, 7);
    const cur = byMonth.get(key) ?? { revenue: 0, costs: 0 };
    if (t.kind === 'REVENUE') cur.revenue += t.amount;
    else cur.costs += t.amount;
    byMonth.set(key, cur);
  }
  const sortedKeys = [...byMonth.keys()].sort();
  const monthly = sortedKeys.map((key) => {
    const m = byMonth.get(key)!;
    return {
      month: monthLabelFromKey(key, config.language),
      revenue: Math.round(m.revenue),
      costs: Math.round(m.costs),
      profit: Math.round(m.revenue - m.costs),
    };
  });

  const totalRevenue = monthly.reduce((s, m) => s + m.revenue, 0);
  const totalCosts = monthly.reduce((s, m) => s + m.costs, 0);

  // ── Revenue breakdown by real category (description "categoria/sottocategoria") ──
  const revenueByCategory = new Map<string, number>();
  for (const t of inPeriod) {
    if (t.kind !== 'REVENUE') continue;
    revenueByCategory.set(t.category, (revenueByCategory.get(t.category) ?? 0) + t.amount);
  }
  const breakdown = [...revenueByCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value: Math.round(value) }));

  // ── KPIs ──
  // Growth: second half of the window vs first half. Needs ≥2 months, otherwise
  // there is no trend to measure and the figure stays null.
  const revenueGrowth = computeGrowth(monthly.map((m) => m.revenue));

  // Gross margin needs COGS told apart from the other costs. It is real only when
  // the org actually tags costs as 'cogs'; otherwise it is not derivable.
  const cogs = inPeriod
    .filter((t) => t.kind === 'COST' && t.category.toLowerCase() === 'cogs')
    .reduce((s, t) => s + t.amount, 0);
  const grossMargin = cogs > 0 && totalRevenue > 0 ? (totalRevenue - cogs) / totalRevenue : null;

  // Same schema as grossMargin/revenueGrowth above: null instead of a false
  // "0% margin" when there is no revenue to divide by.
  const netMargin = totalRevenue > 0 ? (totalRevenue - totalCosts) / totalRevenue : null;

  // ── Cashflow: real CashflowEntry rows inside the window ──
  const cfInPeriod = data.cashflow.filter((c) => c.date >= from && c.date <= to);
  const cfByMonth = new Map<string, { inflow: number; outflow: number }>();
  for (const c of cfInPeriod) {
    const key = toAppDateString(c.date).slice(0, 7);
    const cur = cfByMonth.get(key) ?? { inflow: 0, outflow: 0 };
    if (c.direction === 'INFLOW') cur.inflow += c.amount;
    else cur.outflow += c.amount;
    cfByMonth.set(key, cur);
  }
  const cashMonthly = [...cfByMonth.keys()].sort().map((key) => {
    const m = cfByMonth.get(key)!;
    return {
      month: monthLabelFromKey(key, config.language),
      inflow: Math.round(m.inflow),
      outflow: Math.round(m.outflow),
      net: Math.round(m.inflow - m.outflow),
    };
  });

  // ── Projections: straight-line extrapolation of the REAL revenue trend.
  //    Needs at least 3 real months, otherwise the trend is noise. ──
  const next12m =
    monthly.length >= 3
      ? projectNext12Months(monthly.map((m) => m.revenue), config.language)
      : [];

  // ── Recommendations: the rule-based facts engine (real numbers, no AI). ──
  const recommendations = facts.map((f) => ({
    title: f.title,
    impact: (f.severity === 'critical' ? 'high' : f.severity === 'warning' ? 'medium' : 'low') as
      | 'high'
      | 'medium'
      | 'low',
    description: f.description,
  }));

  const payload: ReportPayload = {
    generatedAt: new Date().toISOString(),
    period: {
      from: from.toISOString(),
      to: to.toISOString(),
      label: periodLabel(config.period, config.language),
    },
    organization: {
      name: org.name,
      industry: org.industry,
      country: org.country,
    },
    kpis: {
      revenue: totalRevenue,
      // Null passes through honestly instead of being coerced to a false "0%
      // growth" — same schema as grossMargin/cashRunwayMonths below. See the
      // comment on computeGrowth() at the bottom of this file.
      revenueGrowth,
      grossMargin,
      netMargin,
      // Runway needs a cash balance, which this schema does not hold anywhere.
      // Null keeps the card out of the PDF instead of inventing a number.
      cashRunwayMonths: null,
      headcount: org.employees,
    },
    finance: { monthly, breakdown },
    cashflow: { monthly: cashMonthly },
    // Kept for type compatibility with the template; the sections that would
    // render them are removed below, so these values are never printed.
    market: { share: 0, competitors: [], growth: 0 },
    operations: { productivity: 0, efficiency: 0, issues: 0 },
    projections: { next12m },
    benchmark: { metrics: [] },
    recommendations,
  };

  // Keep only the requested sections we can actually fill with real data.
  const sections = config.sections.filter((section) => {
    switch (section) {
      case 'executive':
        return monthly.length > 0;
      case 'finance':
        return monthly.length > 0;
      case 'cashflow':
        return cashMonthly.length > 0;
      case 'projections':
        return next12m.length > 0;
      case 'recommendations':
        return recommendations.length > 0;
      // Not derivable from real data — see the note at the top of this file.
      case 'market':
      case 'operations':
      case 'benchmark':
        return false;
      default:
        return false;
    }
  });

  if (sections.length === 0) return null;
  return { payload, sections };
}

/** Growth of the second half of the window vs the first. Null when unmeasurable. */
function computeGrowth(values: number[]): number | null {
  if (values.length < 2) return null;
  const mid = Math.floor(values.length / 2);
  const first = values.slice(0, mid);
  const second = values.slice(mid);
  const avgFirst = first.reduce((s, v) => s + v, 0) / first.length;
  const avgSecond = second.reduce((s, v) => s + v, 0) / second.length;
  if (avgFirst <= 0) return null;
  return (avgSecond - avgFirst) / avgFirst;
}

/**
 * Least-squares straight line over the real monthly revenue, projected forward.
 * Extrapolation only: no seasonality, no events — the same honesty the financial
 * prompt already states to the user.
 */
function projectNext12Months(revenues: number[], lang: string) {
  const n = revenues.length;
  const meanX = (n - 1) / 2;
  const meanY = revenues.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i += 1) {
    num += (i - meanX) * (revenues[i] - meanY);
    den += (i - meanX) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;

  return Array.from({ length: 12 }, (_, k) => {
    const d = new Date();
    d.setMonth(d.getMonth() + k + 1);
    return {
      month: d.toLocaleDateString(lang === 'it' ? 'it-IT' : 'en-US', {
        month: 'short',
        year: '2-digit',
      }),
      // Never project a negative revenue: clamp at zero rather than print nonsense.
      revenue: Math.max(0, Math.round(intercept + slope * (n + k))),
    };
  });
}

function monthLabelFromKey(key: string, lang: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(lang === 'it' ? 'it-IT' : 'en-US', {
    month: 'short',
    year: '2-digit',
  });
}

function periodLabel(period: string, lang: string): string {
  const map: Record<string, { it: string; en: string }> = {
    '1m': { it: 'Ultimo mese', en: 'Last month' },
    '3m': { it: 'Ultimi 3 mesi', en: 'Last 3 months' },
    '6m': { it: 'Ultimi 6 mesi', en: 'Last 6 months' },
    '12m': { it: 'Ultimi 12 mesi', en: 'Last 12 months' },
    custom: { it: 'Periodo personalizzato', en: 'Custom period' },
  };
  const entry = map[period] ?? map['12m'];
  return lang === 'it' ? entry.it : entry.en;
}
