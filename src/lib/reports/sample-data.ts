import type { ReportConfig } from './types';

export interface ReportPayload {
  generatedAt: string;
  period: { from: string; to: string; label: string };
  organization: {
    name: string;
    industry: string;
    country: string;
  };
  kpis: {
    revenue: number;
    revenueGrowth: number;
    grossMargin: number;
    netMargin: number;
    cashRunwayMonths: number;
    headcount: number;
  };
  finance: {
    monthly: Array<{ month: string; revenue: number; costs: number; profit: number }>;
    breakdown: Array<{ label: string; value: number }>;
  };
  cashflow: {
    monthly: Array<{ month: string; inflow: number; outflow: number; net: number }>;
  };
  market: {
    share: number;
    competitors: Array<{ name: string; share: number }>;
    growth: number;
  };
  operations: {
    productivity: number;
    efficiency: number;
    issues: number;
  };
  projections: {
    next12m: Array<{ month: string; revenue: number }>;
  };
  benchmark: {
    metrics: Array<{ label: string; value: number; industryAvg: number }>;
  };
  recommendations: Array<{ title: string; impact: 'high' | 'medium' | 'low'; description: string }>;
}

export function buildSamplePayload(config: ReportConfig): ReportPayload {
  const monthsBack: Record<string, number> = { '1m': 1, '3m': 3, '6m': 6, '12m': 12, custom: 6 };
  const months = monthsBack[config.period] ?? 6;
  const monthly = Array.from({ length: months }, (_, i) => {
    const idx = months - i;
    const revenue = 80_000 + Math.round(Math.sin(i / 2) * 15_000) + i * 4_200;
    const costs = Math.round(revenue * (0.62 + Math.cos(i / 3) * 0.05));
    return {
      month: monthLabel(i, months, config.language),
      revenue,
      costs,
      profit: revenue - costs,
    };
  });

  const cashMonthly = monthly.map((m) => ({
    month: m.month,
    inflow: m.revenue + Math.round(m.revenue * 0.05),
    outflow: m.costs + Math.round(m.costs * 0.08),
    net: m.profit - Math.round(m.costs * 0.03),
  }));

  return {
    generatedAt: new Date().toISOString(),
    period: {
      from: config.customPeriodFrom ?? new Date(Date.now() - months * 30 * 86400000).toISOString(),
      to: config.customPeriodTo ?? new Date().toISOString(),
      label: periodLabel(config.period, months, config.language),
    },
    organization: {
      name: 'Acme Industries Srl',
      industry: 'Manufacturing',
      country: 'Italy',
    },
    kpis: {
      revenue: monthly.reduce((s, m) => s + m.revenue, 0),
      revenueGrowth: 0.142,
      grossMargin: 0.385,
      netMargin: 0.182,
      cashRunwayMonths: 14,
      headcount: 42,
    },
    finance: {
      monthly,
      breakdown: [
        { label: config.language === 'it' ? 'Prodotti' : 'Products', value: 540_000 },
        { label: config.language === 'it' ? 'Servizi' : 'Services', value: 285_000 },
        { label: config.language === 'it' ? 'Licenze' : 'Licenses', value: 124_000 },
      ],
    },
    cashflow: { monthly: cashMonthly },
    market: {
      share: 0.064,
      competitors: [
        { name: 'BetaCo', share: 0.18 },
        { name: 'GammaInc', share: 0.12 },
        { name: 'Delta Group', share: 0.09 },
      ],
      growth: 0.087,
    },
    operations: { productivity: 0.78, efficiency: 0.82, issues: 12 },
    projections: {
      next12m: Array.from({ length: 12 }, (_, i) => ({
        month: monthLabel(11 - i, 12, config.language),
        revenue: 95_000 + i * 6_200,
      })),
    },
    benchmark: {
      metrics: [
        { label: config.language === 'it' ? 'Margine lordo' : 'Gross margin', value: 38.5, industryAvg: 34.2 },
        { label: config.language === 'it' ? 'Crescita ricavi' : 'Revenue growth', value: 14.2, industryAvg: 9.8 },
        { label: config.language === 'it' ? 'Produttivita' : 'Productivity', value: 78, industryAvg: 71 },
      ],
    },
    recommendations: [
      {
        title:
          config.language === 'it'
            ? 'Ottimizza il mix di prodotto'
            : 'Optimize the product mix',
        impact: 'high',
        description:
          config.language === 'it'
            ? 'I prodotti a margine superiore al 40% rappresentano solo il 22% del fatturato. Spostare il focus commerciale puo aumentare il margine lordo di 4-6 punti.'
            : 'Products with margin above 40% represent only 22% of revenue. Shifting commercial focus can lift gross margin by 4-6 points.',
      },
      {
        title:
          config.language === 'it'
            ? 'Riduci il ciclo cassa'
            : 'Shorten the cash cycle',
        impact: 'medium',
        description:
          config.language === 'it'
            ? 'I giorni medi di incasso sono 58, contro una media di settore di 42. Una policy di pagamento piu stretta puo liberare cassa per circa 180k EUR.'
            : 'Average DSO is 58 days vs an industry average of 42. A tighter collection policy can free up around EUR 180k.',
      },
      {
        title:
          config.language === 'it'
            ? 'Investimento in automazione'
            : 'Invest in automation',
        impact: 'low',
        description:
          config.language === 'it'
            ? 'Automatizzare i flussi operativi ripetitivi puo migliorare la produttivita del 6-8% in 12 mesi.'
            : 'Automating repetitive operational workflows can improve productivity by 6-8% within 12 months.',
      },
    ],
  };
}

function monthLabel(offset: number, total: number, lang: string): string {
  const d = new Date();
  d.setMonth(d.getMonth() - offset);
  return d.toLocaleDateString(lang === 'it' ? 'it-IT' : 'en-US', {
    month: 'short',
    year: '2-digit',
  });
}

function periodLabel(period: string, months: number, lang: string): string {
  const map: Record<string, { it: string; en: string }> = {
    '1m': { it: 'Ultimo mese', en: 'Last month' },
    '3m': { it: 'Ultimi 3 mesi', en: 'Last 3 months' },
    '6m': { it: 'Ultimi 6 mesi', en: 'Last 6 months' },
    '12m': { it: 'Ultimi 12 mesi', en: 'Last 12 months' },
    custom: { it: 'Periodo personalizzato', en: 'Custom period' },
  };
  const entry = map[period] ?? map['6m'];
  return lang === 'it' ? entry.it : entry.en;
}
