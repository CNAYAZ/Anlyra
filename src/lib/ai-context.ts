import { prisma } from './prisma';
import { getFinancialFacts } from './facts/financial-facts';
import { effectiveStatus } from './receivables/dto';
import { computeTotals } from './recurring-expenses/dto';
import type { Receivable, RecurringExpense } from '@prisma/client';

export type AIBusinessContext = {
  company: string;
  industry: string;
  employees: number;
  financials: { month: string; revenue: number; costs: number; margin: number }[];
  /** Real, rule-based facts from getFinancialFacts — no AI, no invented numbers. */
  facts: { title: string; description: string; values: Record<string, number | string | string[]> }[];
  /** Omitted entirely when the org has no Receivable rows at all (not a placeholder zero). */
  receivablesSummary?: {
    currency: string;
    totalOutstanding: number;
    totalOverdue: number;
    overdueCount: number;
    openCount: number;
    items: { customerName: string; amount: number; dueDate: string; status: 'OPEN' | 'OVERDUE' }[];
  };
  /** Omitted entirely when the org has no RecurringExpense rows at all. */
  recurringExpensesSummary?: {
    currency: string;
    totalMonthly: number;
    items: { vendorName: string; amount: number; frequency: string }[];
  };
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

  const financialFacts = await getFinancialFacts(organizationId);
  const facts = financialFacts.map((f) => ({
    title: f.title,
    description: f.description,
    values: f.values,
  }));

  // Receivables: omit the whole section when the org has never recorded one —
  // an empty section is honest silence, not a fabricated zero.
  const receivableRows: Receivable[] = await prisma.receivable.findMany({ where: { organizationId } });
  let receivablesSummary: AIBusinessContext['receivablesSummary'];
  if (receivableRows.length > 0) {
    const now = new Date();
    const withStatus = receivableRows.map((r: Receivable) => ({ ...r, effStatus: effectiveStatus(r, now) }));
    type WithStatus = (typeof withStatus)[number];
    const outstanding = withStatus.filter((r: WithStatus) => r.effStatus !== 'PAID');
    const overdue = outstanding.filter((r: WithStatus) => r.effStatus === 'OVERDUE');
    const open = outstanding.filter((r: WithStatus) => r.effStatus === 'OPEN');
    const byDueDateAsc = (a: WithStatus, b: WithStatus) => a.dueDate.getTime() - b.dueDate.getTime();
    const prioritized = [...overdue.sort(byDueDateAsc), ...open.sort(byDueDateAsc)];

    receivablesSummary = {
      currency: org.currency,
      totalOutstanding: outstanding.reduce((s: number, r: WithStatus) => s + r.amount, 0),
      totalOverdue: overdue.reduce((s: number, r: WithStatus) => s + r.amount, 0),
      overdueCount: overdue.length,
      openCount: open.length,
      items: prioritized.slice(0, 10).map((r: WithStatus) => ({
        customerName: r.customerName,
        amount: r.amount,
        dueDate: r.dueDate.toISOString().slice(0, 10),
        status: r.effStatus as 'OPEN' | 'OVERDUE',
      })),
    };
  }

  // Recurring expenses: same "omit, don't fabricate" rule.
  const recurringRows: RecurringExpense[] = await prisma.recurringExpense.findMany({ where: { organizationId } });
  let recurringExpensesSummary: AIBusinessContext['recurringExpensesSummary'];
  if (recurringRows.length > 0) {
    const { totalMonthly } = computeTotals(recurringRows);
    const activeByMonthlyDesc = recurringRows
      .filter((e: RecurringExpense) => e.active)
      .map((e: RecurringExpense) => ({ ...e, monthlyEquivalent: e.frequency === 'YEARLY' ? e.amount / 12 : e.amount }))
      .sort((a, b) => b.monthlyEquivalent - a.monthlyEquivalent);

    recurringExpensesSummary = {
      currency: org.currency,
      totalMonthly,
      items: activeByMonthlyDesc.slice(0, 10).map((e) => ({
        vendorName: e.vendorName,
        amount: e.amount,
        frequency: e.frequency,
      })),
    };
  }

  return {
    company: org.name,
    industry: org.industry,
    employees: org.employees,
    financials,
    facts,
    receivablesSummary,
    recurringExpensesSummary,
  };
}

export function buildSystemPrompt(ctx: AIBusinessContext, locale: 'IT' | 'EN' | 'it' | 'en' = 'IT'): string {
  const lang = locale.toString().toLowerCase().startsWith('en') ? 'english' : 'italiano';
  const data = {
    azienda: ctx.company,
    settore: ctx.industry,
    dipendenti: ctx.employees,
    finanze_ultimi_3_mesi: ctx.financials,
    segnalazioni: ctx.facts,
    scadenzario: ctx.receivablesSummary,
    spese_ricorrenti: ctx.recurringExpensesSummary,
  };
  return [
    `Sei un analista business esperto. Stai analizzando i dati REALI di ${ctx.company}, azienda ${ctx.industry} con ${ctx.employees} dipendenti.`,
    `Ecco i dati disponibili (JSON): ${JSON.stringify(data)}.`,
    'Usa SOLO i numeri contenuti in questi dati: non inventarli e non stimarli. Se un dato che ti servirebbe non è presente (es. una sezione assente perché non ci sono ancora dati per quella categoria), dillo esplicitamente invece di supporre un valore.',
    `Rispondi in ${lang}, sii specifico, usa i numeri reali, dai suggerimenti concreti.`,
  ].join(' ');
}
