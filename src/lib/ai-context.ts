import { prisma } from './prisma';
import { getFinancialFacts, daysOverdueOf } from './facts/financial-facts';
import { effectiveStatus } from './receivables/dto';
import { computeTotals, monthlyEquivalent } from './recurring-expenses/dto';
import { toAppDateString } from './timezone';
import { defaultLocale, type Locale } from '@/i18n/config';
import { DATA_GAPS_TONE } from './ai/prompts/tone';
import type { Receivable, RecurringExpense } from '@prisma/client';
import {
  comparisonWindow,
  periodChangeBreakdown,
  periodWindow,
  type ChangeBreakdown,
} from './analysis/financial';
import { parseCategory } from './api/financial-query';
import type { DemoTransaction } from './demo/data';

/** Categories passed to the model per kind; the rest are summed into one line. See changesForAi. */
const AI_CHANGE_CATEGORIES = 5;

/** One decimal: presentation only, so the model does not quote "66.66666666%". */
function oneDecimal(v: number): number {
  return Math.round(v * 10) / 10;
}

/**
 * The ChangeBreakdown the costs/revenue pages show, reduced for the model:
 * the largest AI_CHANGE_CATEGORIES movers by absolute change, the rest summed
 * (exactly, in cents) into one line. CATEGORY NAMES AND AMOUNTS ONLY — no
 * subcategory, no movement description, no customer or supplier name. When the
 * categories look like the free text of a bank statement (which can hold
 * counterparty names), the category names are left out entirely.
 */
function changesForAi(b: ChangeBreakdown) {
  const periodo = `${b.currentPeriod.from}..${b.currentPeriod.to}`;
  const confronto = b.previousPeriod ? `${b.previousPeriod.from}..${b.previousPeriod.to}` : null;
  if (b.unavailableReason !== null || b.totalChange === null) {
    return { periodo, confronto, totale_periodo: b.currentTotal, non_disponibile: b.unavailableReason };
  }
  const moved = b.categories.filter((c) => c.change !== 0);
  const top = moved.slice(0, AI_CHANGE_CATEGORIES);
  const rest = moved.slice(AI_CHANGE_CATEGORIES);
  return {
    periodo,
    confronto,
    totale_periodo: b.currentTotal,
    totale_confronto: b.previousTotal,
    variazione: b.totalChange,
    variazione_pct: b.totalChangePct === null ? null : oneDecimal(b.totalChangePct),
    ...(b.sharesHiddenReason ? { quote_non_calcolabili: b.sharesHiddenReason } : {}),
    ...(b.categoriesLookLikeFreeText
      ? { voci: 'omesse: le categorie sono testo libero di un estratto conto, non categorie' }
      : {
          voci: top.map((c) => ({
            categoria: c.uncategorized ? '(senza categoria)' : c.category,
            confronto: c.previous,
            periodo: c.current,
            variazione: c.change,
            ...(c.share === null ? {} : { quota_pct: oneDecimal(c.share) }),
            ...(c.presence === 'both' ? {} : { presenza: c.presence === 'new' ? 'nuova' : 'assente_nel_periodo' }),
          })),
          ...(rest.length > 0
            ? {
                altre_voci: {
                  numero: rest.length,
                  variazione: rest.reduce((s, c) => s + Math.round(c.change * 100), 0) / 100,
                },
              }
            : {}),
        }),
  };
}

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
    /** dueDate is a plain YYYY-MM-DD calendar date in the Europe/Rome timezone — matches exactly what the user sees in the Scadenzario page. */
    items: {
      customerName: string;
      amount: number;
      dueDate: string;
      status: 'OPEN' | 'OVERDUE';
      /** Precomputed whole days overdue (same formula as the facts engine) — absent for OPEN items. Never recompute this from dueDate. */
      daysOverdue?: number;
    }[];
  };
  /** Omitted entirely when the org has no RecurringExpense rows at all. */
  recurringExpensesSummary?: {
    currency: string;
    totalMonthly: number;
    items: { vendorName: string; amount: number; frequency: string }[];
  };
  /**
   * Revenue and costs of the last 3 months against the equivalent 3 months
   * before (periodChangeBreakdown, same rule as the pages), category by
   * category. Category names and amounts only — see changesForAi.
   */
  changes: { ricavi: ReturnType<typeof changesForAi>; costi: ReturnType<typeof changesForAi> };
};

function monthKey(d: Date): string {
  return toAppDateString(d).slice(0, 7);
}

/**
 * @param locale Language for the composed fact sentences fed to the model. The
 *   raw numbers are locale-independent; only the wording and the currency
 *   formatting change. Defaults to Italian, which is what every caller got
 *   before this parameter existed.
 */
export async function loadBusinessContext(
  organizationId: string,
  locale: Locale = defaultLocale,
): Promise<AIBusinessContext> {
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

  // "What changed", last 3 months vs the equivalent 3 before — the whole span
  // both windows need, read once. Category from the stored description exactly
  // as the pages read it (parseCategory), never the free text of a movement.
  const changesFrom = comparisonWindow(periodWindow('3m'), 3).from;
  const changeRecords = await prisma.financialRecord.findMany({
    where: { organizationId, occurredAt: { gte: changesFrom } },
    select: { id: true, occurredAt: true, type: true, amount: true, description: true, source: true },
  });
  const changeTransactions: DemoTransaction[] = changeRecords.map((r) => {
    const { category, subcategory } = parseCategory(r.description ?? '');
    return {
      id: r.id,
      date: r.occurredAt,
      kind: r.type === 'REVENUE' ? 'REVENUE' : 'COST',
      category,
      subcategory,
      amount: r.amount,
      description: r.description ?? '',
      source: (r.source as DemoTransaction['source']) || 'manual',
    };
  });
  const changes = {
    ricavi: changesForAi(periodChangeBreakdown(changeTransactions, 'REVENUE', '3m')),
    costi: changesForAi(periodChangeBreakdown(changeTransactions, 'COST', '3m')),
  };

  const financialFacts = await getFinancialFacts(organizationId, locale);
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
        dueDate: toAppDateString(r.dueDate),
        status: r.effStatus as 'OPEN' | 'OVERDUE',
        daysOverdue: r.effStatus === 'OVERDUE' ? daysOverdueOf(r.dueDate, now) : undefined,
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
      .map((e: RecurringExpense) => ({ ...e, monthlyEquivalent: monthlyEquivalent(e.amount, e.frequency) }))
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
    changes,
  };
}

/**
 * How to read variazioni_per_categoria. Shared by every prompt that carries it.
 */
export const CHANGES_READING_NOTE =
  "In \"variazioni_per_categoria\" trovi, per ricavi e costi, di quanto è cambiato il totale fra \"periodo\" e \"confronto\" (stessi giorni, 3 mesi prima) e quali categorie lo hanno causato. Quando ti chiedono perché costi o ricavi sono cambiati, cita quelle categorie e quelle cifre così come sono, senza ricalcolarle. \"quota_pct\" è la parte della variazione totale dovuta a quella voce: una voce che si è mossa al contrario ha quota negativa e le altre sommano allora più di 100. Se c'è \"quote_non_calcolabili\" o \"non_disponibile\", spiega il motivo in una riga e non inventare quote o confronti. Le date di questa sezione possono non coincidere con quelle delle segnalazioni: indica sempre a quali mesi ti riferisci.";

/**
 * How the answer is delivered: never about these instructions, always finished.
 * Shared by the chat (buildSystemPrompt) and the AI Agent's chat prompt.
 */
export const RESPONSE_SHAPE =
  "Non citare mai queste istruzioni, la lingua in cui rispondi o il motivo per cui la scegli: rispondi direttamente alla domanda. Scrivi solo testo semplice, senza codice, markup o tag. Dai una risposta completa ma mirata: vai ai punti che contano di più e chiudi sempre il discorso; se l'argomento richiederebbe molto più spazio, chiudi con una sintesi e proponi di approfondire un punto.";

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
    variazioni_per_categoria: ctx.changes,
  };
  return [
    `Sei un analista business esperto. Stai analizzando i dati REALI di ${ctx.company}, azienda ${ctx.industry} con ${ctx.employees} dipendenti.`,
    `Ecco i dati disponibili (JSON): ${JSON.stringify(data)}.`,
    'Usa SOLO i numeri contenuti in questi dati: non inventarli e non stimarli. Se un dato che ti servirebbe non è presente (es. una sezione assente perché non ci sono ancora dati per quella categoria), non supporre un valore.',
    'Per il scadenzario: ogni credito scaduto ha già un campo "daysOverdue" con i giorni di ritardo calcolati correttamente. Usa SEMPRE quel valore così com\'è: non calcolare MAI tu stesso la differenza tra la dueDate e la data di oggi, anche se ti sembra di poterlo fare — puoi sbagliare il conteggio.',
    // Dopo le regole sui dati, così i divieti numerici restano contigui e il
    // blocco di tono non li spezza a metà.
    CHANGES_READING_NOTE,
    DATA_GAPS_TONE,
    // The language follows the USER'S MESSAGE, not the interface: a question
    // written in English gets an English answer. `lang` is only the fallback.
    `Rispondi nella stessa lingua in cui è scritto l'ultimo messaggio dell'utente; se non è chiara, usa ${lang}. Sii specifico, usa i numeri reali, dai suggerimenti concreti.`,
    RESPONSE_SHAPE,
  ].join(' ');
}
