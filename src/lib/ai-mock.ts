import type { AIBusinessContext } from './ai-context';
import type { Locale } from '@/i18n/config';

export function mockChatResponse(message: string, ctx: AIBusinessContext, locale: Locale): string {
  const it = locale === 'it';
  const lastFin = ctx.financials[0];
  const churn = ctx.kpis.find((k) => k.name.toLowerCase().includes('churn'));
  const cac = ctx.kpis.find((k) => k.name.toLowerCase().includes('cac'));

  if (it) {
    const lines = [
      `Analizzando i dati di ${ctx.company} (${ctx.industry}, ${ctx.employees} dipendenti):`,
      lastFin
        ? `Nell'ultimo mese (${lastFin.month}) hai generato ricavi per €${lastFin.revenue.toLocaleString('it-IT')} con un margine del ${lastFin.margin.toFixed(1)}%.`
        : 'Non ho ancora dati finanziari recenti.',
      churn ? `Il churn rate è al ${churn.value}% (target ${churn.target ?? 'n/d'}%).` : '',
      cac ? `Il CAC è di €${cac.value} contro un target di €${cac.target ?? 'n/d'}.` : '',
      `\nIn relazione alla tua domanda — "${message.slice(0, 120)}${message.length > 120 ? '…' : ''}" — il mio suggerimento è di concentrarti su tre azioni: 1) ridurre il churn con un programma di customer success dedicato, 2) ottimizzare il mix canali per abbassare il CAC, 3) reinvestire parte del margine generato in acquisition di alta qualità.`,
      `\n(Nota: questa è una risposta simulata in assenza di ANTHROPIC_API_KEY.)`,
    ];
    return lines.filter(Boolean).join('\n');
  }
  const lines = [
    `Analyzing ${ctx.company} data (${ctx.industry}, ${ctx.employees} employees):`,
    lastFin
      ? `Last month (${lastFin.month}) you generated $${lastFin.revenue.toLocaleString('en-US')} in revenue with a ${lastFin.margin.toFixed(1)}% margin.`
      : 'No recent financial data yet.',
    churn ? `Churn rate is ${churn.value}% (target ${churn.target ?? 'n/a'}%).` : '',
    cac ? `CAC is $${cac.value} vs a target of $${cac.target ?? 'n/a'}.` : '',
    `\nRegarding your question — "${message.slice(0, 120)}${message.length > 120 ? '…' : ''}" — my suggestion is to focus on three actions: 1) reduce churn with a dedicated customer success program, 2) optimize channel mix to lower CAC, 3) reinvest part of generated margin into high-quality acquisition.`,
    `\n(Note: this is a mock response in absence of ANTHROPIC_API_KEY.)`,
  ];
  return lines.filter(Boolean).join('\n');
}

export function mockInsights(ctx: AIBusinessContext, locale: Locale) {
  const it = locale === 'it';
  const lastFin = ctx.financials[0];
  const margin = lastFin?.margin ?? 30;
  const revenue = lastFin?.revenue ?? 100000;

  if (it) {
    return [
      {
        type: 'OPPORTUNITY' as const,
        priority: 'HIGH' as const,
        title: `Opportunità di scaling con margine al ${margin.toFixed(1)}%`,
        summary: `Con il margine attuale puoi reinvestire €${Math.round(revenue * 0.1).toLocaleString('it-IT')}/mese in acquisition.`,
        content: `Il margine del ${margin.toFixed(1)}% sui ricavi di €${revenue.toLocaleString('it-IT')} ti lascia spazio per un investimento aggressivo in acquisition mantenendo la profittabilità. Suggerimento: alloca €${Math.round(revenue * 0.1).toLocaleString('it-IT')}/mese sui canali con CAC inferiore alla media (content e referral).`,
        confidence: 0.84,
      },
      {
        type: 'STRATEGY' as const,
        priority: 'MEDIUM' as const,
        title: 'Diversificare i segmenti di clientela',
        summary: 'Concentrazione del fatturato su pochi segmenti aumenta il rischio. Esplora 1-2 verticali adiacenti.',
        content: `Per ${ctx.company} nel settore ${ctx.industry}, esplorare verticali adiacenti può ridurre il rischio di dipendenza e aprire nuove revenue stream. Inizia con un'analisi di 2-3 segmenti vicini al tuo core e fai pilot mirati con 5-10 prospect ciascuno.`,
        confidence: 0.7,
      },
    ];
  }
  return [
    {
      type: 'OPPORTUNITY' as const,
      priority: 'HIGH' as const,
      title: `Scaling opportunity with ${margin.toFixed(1)}% margin`,
      summary: `Current margin lets you reinvest $${Math.round(revenue * 0.1).toLocaleString('en-US')}/month in acquisition.`,
      content: `The ${margin.toFixed(1)}% margin on $${revenue.toLocaleString('en-US')} revenue leaves room for aggressive acquisition investment while maintaining profitability. Suggestion: allocate $${Math.round(revenue * 0.1).toLocaleString('en-US')}/month on below-average CAC channels (content and referral).`,
      confidence: 0.84,
    },
    {
      type: 'STRATEGY' as const,
      priority: 'MEDIUM' as const,
      title: 'Diversify customer segments',
      summary: 'Revenue concentration on few segments increases risk. Explore 1-2 adjacent verticals.',
      content: `For ${ctx.company} in the ${ctx.industry} sector, exploring adjacent verticals can reduce dependency risk and open new revenue streams. Start with an analysis of 2-3 segments close to your core and run targeted pilots with 5-10 prospects each.`,
      confidence: 0.7,
    },
  ];
}
