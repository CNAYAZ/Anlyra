// SaaS B2B sector benchmark reference values.
// Source: aggregated industry medians (OpenView, SaaS Capital, ProfitWell).

export type BenchmarkDimension = {
  key: string;
  label: string;
  unit: 'percent' | 'currency' | 'score' | 'ratio';
  // For "good is high" metrics, sectorMedian is what we benchmark against.
  // For "good is low" metrics (e.g. churn), invert is true.
  invert?: boolean;
  sectorMedian: number;
  sectorTopQuartile: number;
  // Suggestion shown when company underperforms vs sector median.
  suggestion: string;
};

export const SAAS_B2B_BENCHMARKS: BenchmarkDimension[] = [
  {
    key: 'grossMargin',
    label: 'Margine lordo',
    unit: 'percent',
    sectorMedian: 75,
    sectorTopQuartile: 82,
    suggestion:
      'Rinegozia hosting/CDN e infrastruttura cloud, automatizza onboarding e support per ridurre i costi variabili.',
  },
  {
    key: 'revenueGrowthYoY',
    label: 'Crescita ricavi YoY',
    unit: 'percent',
    sectorMedian: 35,
    sectorTopQuartile: 60,
    suggestion:
      'Investi in canali a CAC più basso (referral, content) e migliora il pipeline marketing-sales con lead scoring.',
  },
  {
    key: 'churnRate',
    label: 'Churn mensile',
    unit: 'percent',
    invert: true,
    sectorMedian: 4,
    sectorTopQuartile: 2,
    suggestion:
      'Crea un programma di customer success proattivo per gli account a rischio identificati nei primi 60 giorni.',
  },
  {
    key: 'nps',
    label: 'NPS',
    unit: 'score',
    sectorMedian: 35,
    sectorTopQuartile: 50,
    suggestion:
      'Sondaggio NPS trimestrale + closing the loop: contatta i detrattori entro 48h, intervista i promotori.',
  },
  {
    key: 'cac',
    label: 'CAC',
    unit: 'currency',
    invert: true,
    sectorMedian: 280,
    sectorTopQuartile: 180,
    suggestion:
      'Sposta budget dai canali paid con CAC più alto verso content marketing, partnership e referral program.',
  },
  {
    key: 'ltvCacRatio',
    label: 'LTV / CAC',
    unit: 'ratio',
    sectorMedian: 4,
    sectorTopQuartile: 6,
    suggestion:
      'Aumenta retention e ARPU (upselling, expansion revenue) per migliorare il LTV. Target: rapporto >= 4x.',
  },
  {
    key: 'revenuePerEmployee',
    label: 'Revenue / dipendente',
    unit: 'currency',
    sectorMedian: 220_000,
    sectorTopQuartile: 320_000,
    suggestion:
      'Automatizza task ripetitivi (RPA, AI), riconsidera la struttura organizzativa, fai leva su strumenti self-service.',
  },
  {
    key: 'conversionRate',
    label: 'Conversion rate (trial → paid)',
    unit: 'percent',
    sectorMedian: 2.5,
    sectorTopQuartile: 4.5,
    suggestion:
      'Migliora il free-trial: onboarding guidato, time-to-value entro 7 giorni, email nurture sequence personalizzata.',
  },
];

export type CompanyBenchmark = {
  key: string;
  label: string;
  unit: BenchmarkDimension['unit'];
  invert: boolean;
  ourValue: number;
  sectorMedian: number;
  sectorTopQuartile: number;
  // 0..100 score where 100 = top quartile direction
  score: number;
  status: 'good' | 'warn' | 'bad';
  suggestion: string;
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function scoreCompany(
  ours: Record<string, number | undefined>,
): CompanyBenchmark[] {
  return SAAS_B2B_BENCHMARKS.map((dim) => {
    const ourValue = ours[dim.key] ?? 0;
    const median = dim.sectorMedian;
    const top = dim.sectorTopQuartile;
    const range = Math.abs(top - median) || 1;
    let score: number;
    if (dim.invert) {
      // Lower is better
      const delta = (median - ourValue) / range;
      score = clamp(50 + delta * 25, 0, 100);
    } else {
      const delta = (ourValue - median) / range;
      score = clamp(50 + delta * 25, 0, 100);
    }
    let status: 'good' | 'warn' | 'bad';
    if (score >= 65) status = 'good';
    else if (score >= 45) status = 'warn';
    else status = 'bad';
    return {
      key: dim.key,
      label: dim.label,
      unit: dim.unit,
      invert: !!dim.invert,
      ourValue,
      sectorMedian: median,
      sectorTopQuartile: top,
      score: Math.round(score),
      status,
      suggestion: dim.suggestion,
    };
  });
}
