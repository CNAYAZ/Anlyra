import { prisma } from './prisma';

export type AIBusinessContext = {
  company: string;
  industry: string;
  employees: number;
  financials: { month: string; revenue: number; costs: number; margin: number }[];
  kpis: { name: string; value: number; unit: string | null; target: number | null }[];
  competitors: { name: string; marketShare: number | null; notes: string | null }[];
};

function monthKey(d: Date): string {
  return d.toISOString().slice(0, 7);
}

export async function loadBusinessContext(organizationId: string): Promise<AIBusinessContext> {
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });

  const since = new Date();
  since.setMonth(since.getMonth() - 3);

  const records = await prisma.financialRecord.findMany({
    where: { organizationId, occurredAt: { gte: since } },
    orderBy: { occurredAt: 'desc' },
  });

  const buckets = new Map<string, { revenue: number; costs: number }>();
  for (const r of records) {
    const key = monthKey(r.occurredAt);
    const cur = buckets.get(key) ?? { revenue: 0, costs: 0 };
    if (r.type === 'REVENUE' || r.type === 'revenue') cur.revenue += r.amount;
    else cur.costs += r.amount;
    buckets.set(key, cur);
  }
  const financials = Array.from(buckets.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 3)
    .map(([month, v]) => ({
      month,
      revenue: v.revenue,
      costs: v.costs,
      margin: v.revenue > 0 ? ((v.revenue - v.costs) / v.revenue) * 100 : 0,
    }));

  const kpiRows = await prisma.kPI.findMany({
    where: { organizationId },
    orderBy: { updatedAt: 'desc' },
    take: 10,
  });

  const competitorRows = await prisma.competitor_b7.findMany({
    where: { organizationId },
    take: 10,
  });

  return {
    company: org.name,
    industry: org.industry,
    employees: org.employees,
    financials,
    kpis: kpiRows.map((k) => ({
      name: k.name,
      value: k.value,
      unit: k.unit,
      target: k.target,
    })),
    competitors: competitorRows.map((c) => ({
      name: c.name,
      marketShare: c.marketShare,
      notes: c.notes,
    })),
  };
}

export function buildSystemPrompt(ctx: AIBusinessContext, locale: 'IT' | 'EN' | 'it' | 'en' = 'IT'): string {
  const lang = locale.toString().toLowerCase().startsWith('en') ? 'english' : 'italiano';
  const data = {
    azienda: ctx.company,
    settore: ctx.industry,
    dipendenti: ctx.employees,
    finanze_ultimi_3_mesi: ctx.financials,
    kpi_recenti: ctx.kpis,
    competitor: ctx.competitors,
  };
  return [
    `Sei un analista business esperto. Stai analizzando i dati di ${ctx.company}, azienda ${ctx.industry} con ${ctx.employees} dipendenti.`,
    `Ecco i dati recenti: ${JSON.stringify(data)}.`,
    `Rispondi in ${lang}, sii specifico, usa i numeri reali, dai suggerimenti concreti.`,
  ].join(' ');
}
