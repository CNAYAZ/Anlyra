import { prisma } from './prisma';
import type { Locale } from '@prisma/client';

export type AIBusinessContext = {
  company: string;
  industry: string;
  employees: number;
  financials: { month: string; revenue: number; costs: number; margin: number }[];
  kpis: { name: string; value: number; unit: string | null; target: number | null }[];
  competitors: { name: string; marketShare: number | null; notes: string | null }[];
};

export async function loadBusinessContext(organizationId: string): Promise<AIBusinessContext> {
  const [org, financials, kpis, competitors] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: organizationId } }),
    prisma.financialData.findMany({
      where: { organizationId },
      orderBy: { month: 'desc' },
      take: 3,
    }),
    prisma.kPI.findMany({ where: { organizationId } }),
    prisma.competitor.findMany({ where: { organizationId } }),
  ]);

  return {
    company: org.name,
    industry: org.industry,
    employees: org.employees,
    financials: financials.map((f) => ({
      month: f.month.toISOString().slice(0, 7),
      revenue: f.revenue,
      costs: f.costs,
      margin: f.margin,
    })),
    kpis: kpis.map((k) => ({ name: k.name, value: k.value, unit: k.unit, target: k.target })),
    competitors: competitors.map((c) => ({ name: c.name, marketShare: c.marketShare, notes: c.notes })),
  };
}

const localeNames: Record<Locale, string> = {
  IT: 'italiano',
  EN: 'english',
};

export function buildSystemPrompt(ctx: AIBusinessContext, locale: Locale): string {
  const lang = localeNames[locale];
  const fin = ctx.financials
    .map((f) => `- ${f.month}: ricavi ${f.revenue.toFixed(0)}, costi ${f.costs.toFixed(0)}, margine ${f.margin.toFixed(1)}%`)
    .join('\n');
  const kpis = ctx.kpis
    .map((k) => `- ${k.name}: ${k.value}${k.unit ? ' ' + k.unit : ''}${k.target ? ` (target ${k.target}${k.unit ? ' ' + k.unit : ''})` : ''}`)
    .join('\n');
  const comp = ctx.competitors
    .map((c) => `- ${c.name}${c.marketShare !== null ? ` (market share ${c.marketShare}%)` : ''}${c.notes ? `: ${c.notes}` : ''}`)
    .join('\n');

  return [
    `Sei un analista business esperto. Analizzi i dati di ${ctx.company}, settore ${ctx.industry}, ${ctx.employees} dipendenti.`,
    `\nDati finanziari ultimi 3 mesi:\n${fin || '- nessun dato'}`,
    `\nKPI attuali:\n${kpis || '- nessun KPI'}`,
    `\nCompetitor principali:\n${comp || '- nessun competitor'}`,
    `\nRispondi in ${lang}. Sii specifico, usa numeri reali tratti dai dati sopra, dai suggerimenti concreti e azionabili. Evita risposte generiche.`,
  ].join('\n');
}
