import type { MetricKey, PeriodKey } from './types';

const PERIOD_POINTS: Record<PeriodKey, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 12,
  '12m': 12,
  ytd: 12,
};

const METRIC_BASELINE: Record<MetricKey, { base: number; volatility: number; growth: number; unit: 'currency' | 'count' | 'percent' }> = {
  revenue: { base: 48000, volatility: 0.18, growth: 0.04, unit: 'currency' },
  orders: { base: 320, volatility: 0.22, growth: 0.05, unit: 'count' },
  customers: { base: 1180, volatility: 0.06, growth: 0.025, unit: 'count' },
  margin: { base: 38, volatility: 0.04, growth: 0.005, unit: 'percent' },
  churn: { base: 4.2, volatility: 0.1, growth: -0.01, unit: 'percent' },
  mrr: { base: 21000, volatility: 0.08, growth: 0.06, unit: 'currency' },
  cac: { base: 145, volatility: 0.07, growth: -0.01, unit: 'currency' },
  ltv: { base: 980, volatility: 0.05, growth: 0.02, unit: 'currency' },
};

function pseudoRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function pointLabel(period: PeriodKey, index: number, total: number, locale: string): string {
  const today = new Date(2026, 3, 26);
  if (period === '7d' || period === '30d') {
    const d = new Date(today);
    d.setDate(today.getDate() - (total - 1 - index));
    return new Intl.DateTimeFormat(locale === 'it' ? 'it-IT' : 'en-US', { day: '2-digit', month: 'short' }).format(d);
  }
  // monthly buckets
  const months = locale === 'it'
    ? ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIdx = (today.getMonth() - (total - 1 - index) + 12 * 12) % 12;
  return months[monthIdx];
}

export interface SeriesPoint {
  label: string;
  value: number;
}

export function getSeries(metric: MetricKey, period: PeriodKey, locale: string = 'it', seed = 1): SeriesPoint[] {
  const meta = METRIC_BASELINE[metric];
  const points = PERIOD_POINTS[period];
  const result: SeriesPoint[] = [];
  for (let i = 0; i < points; i++) {
    const noise = (pseudoRandom(seed + i * 7 + metric.length) - 0.5) * meta.volatility;
    const trend = meta.base * (1 + meta.growth * (i / points));
    const value = Math.max(0, trend * (1 + noise));
    result.push({ label: pointLabel(period, i, points, locale), value: Math.round(value * 100) / 100 });
  }
  return result;
}

export function getKpi(metric: MetricKey, period: PeriodKey) {
  const series = getSeries(metric, period, 'it', 11);
  const current = series[series.length - 1]?.value ?? 0;
  const previous = series[Math.max(0, series.length - 2)]?.value ?? current;
  const delta = previous === 0 ? 0 : ((current - previous) / previous) * 100;
  return { current, previous, delta, unit: METRIC_BASELINE[metric].unit };
}

export function getCategoryBreakdown(metric: MetricKey, locale: string = 'it') {
  const labels = locale === 'it'
    ? ['Italia', 'Francia', 'Germania', 'Spagna', 'UK']
    : ['Italy', 'France', 'Germany', 'Spain', 'UK'];
  const meta = METRIC_BASELINE[metric];
  return labels.map((label, i) => ({
    label,
    value: Math.round(meta.base * (0.4 + pseudoRandom(i * 13 + metric.length) * 0.6)),
  }));
}

export function getRadarProfile(locale: string = 'it') {
  const dims = locale === 'it'
    ? ['Vendite', 'Marketing', 'Operations', 'Finanza', 'Prodotto', 'Customer']
    : ['Sales', 'Marketing', 'Operations', 'Finance', 'Product', 'Customer'];
  return dims.map((d, i) => ({
    dimension: d,
    you: Math.round(60 + pseudoRandom(i + 3) * 35),
    industry: Math.round(55 + pseudoRandom(i + 9) * 30),
  }));
}

export function getGaugeValue(metric: MetricKey) {
  const kpi = getKpi(metric, '30d');
  const target = METRIC_BASELINE[metric].base * (METRIC_BASELINE[metric].growth >= 0 ? 1.1 : 0.9);
  const ratio = Math.min(1.2, Math.max(0, kpi.current / target));
  return { value: kpi.current, target, ratio, unit: METRIC_BASELINE[metric].unit };
}

export function getTableRows(period: PeriodKey, locale: string = 'it') {
  const products = locale === 'it'
    ? ['Prodotto Alpha', 'Prodotto Beta', 'Prodotto Gamma', 'Prodotto Delta', 'Prodotto Epsilon']
    : ['Product Alpha', 'Product Beta', 'Product Gamma', 'Product Delta', 'Product Epsilon'];
  return products.map((name, i) => ({
    name,
    revenue: Math.round(8000 + pseudoRandom(i * 5 + period.length) * 22000),
    orders: Math.round(40 + pseudoRandom(i * 7 + 2) * 220),
    margin: Math.round((28 + pseudoRandom(i * 11) * 18) * 10) / 10,
  }));
}

export function getFunnelSteps(locale: string = 'it') {
  const steps = locale === 'it'
    ? ['Visite', 'Lead', 'Trial', 'Paganti', 'Retained']
    : ['Visits', 'Leads', 'Trial', 'Paying', 'Retained'];
  let value = 12000;
  return steps.map((label, i) => {
    const v = Math.round(value);
    value *= 0.32 + pseudoRandom(i + 17) * 0.18;
    return { label, value: v };
  });
}

export function getHeatmap(locale: string = 'it') {
  const days = locale === 'it' ? ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = ['09', '11', '13', '15', '17', '19', '21'];
  return { days, hours, matrix: days.map((_, di) => hours.map((__, hi) => Math.round(pseudoRandom(di * 31 + hi * 7) * 100))) };
}

export function getForecast(metric: MetricKey) {
  const history = getSeries(metric, '12m', 'it', 5).slice(-6);
  const lastValue = history[history.length - 1].value;
  const growth = METRIC_BASELINE[metric].growth + 0.02;
  const forecast = Array.from({ length: 3 }, (_, i) => ({
    label: `+${i + 1}m`,
    value: Math.round(lastValue * Math.pow(1 + growth, i + 1) * 100) / 100,
    isForecast: true,
  }));
  return { history: history.map((p) => ({ ...p, isForecast: false })), forecast };
}

export function getBenchmark(metric: MetricKey) {
  const meta = METRIC_BASELINE[metric];
  const you = meta.base * (1 + meta.growth * 4);
  const industry = meta.base;
  const top10 = meta.base * 1.35;
  return {
    you: Math.round(you * 100) / 100,
    industry: Math.round(industry * 100) / 100,
    top10: Math.round(top10 * 100) / 100,
    unit: meta.unit,
  };
}

export function getAiInsight(metric: MetricKey, period: PeriodKey, locale: string = 'it') {
  const kpi = getKpi(metric, period);
  const direction = kpi.delta >= 0
    ? (locale === 'it' ? 'in crescita' : 'growing')
    : (locale === 'it' ? 'in calo' : 'declining');
  const itTexts = [
    `Il ${nameMetricIt(metric)} è ${direction} del ${Math.abs(kpi.delta).toFixed(1)}% rispetto al periodo precedente.`,
    `Concentra le risorse sui canali con maggior margine: il top performer ha generato il 38% del fatturato.`,
    `Considera un test di pricing: l'elasticità stimata è bassa nei prossimi 30 giorni.`,
  ];
  const enTexts = [
    `${nameMetricEn(metric)} is ${direction} ${Math.abs(kpi.delta).toFixed(1)}% versus the previous period.`,
    `Focus resources on the highest-margin channels: the top performer drove 38% of revenue.`,
    `Consider a pricing test: estimated price elasticity is low over the next 30 days.`,
  ];
  return { bullets: locale === 'it' ? itTexts : enTexts, generatedBy: 'Claude Sonnet 4', delta: kpi.delta };
}

function nameMetricIt(m: MetricKey) {
  const map: Record<MetricKey, string> = {
    revenue: 'fatturato',
    orders: 'numero di ordini',
    customers: 'numero clienti',
    margin: 'margine',
    churn: 'churn',
    mrr: 'MRR',
    cac: 'CAC',
    ltv: 'LTV',
  };
  return map[m];
}
function nameMetricEn(m: MetricKey) {
  const map: Record<MetricKey, string> = {
    revenue: 'Revenue',
    orders: 'Orders',
    customers: 'Customer count',
    margin: 'Margin',
    churn: 'Churn',
    mrr: 'MRR',
    cac: 'CAC',
    ltv: 'LTV',
  };
  return map[m];
}

export function metricUnit(metric: MetricKey) {
  return METRIC_BASELINE[metric].unit;
}
