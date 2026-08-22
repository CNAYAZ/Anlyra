import { createTranslator } from 'next-intl';
import { prisma } from '@/lib/prisma';
import { formatCurrency } from '@/lib/format';
import { effectiveStatus } from '@/lib/receivables/dto';
import { computeTotals } from '@/lib/recurring-expenses/dto';
import { appDateStartUTC } from '@/lib/timezone';
import { defaultLocale, type Locale } from '@/i18n/config';
import itMessages from '@/messages/it.json';
import enMessages from '@/messages/en.json';
import type { Receivable, RecurringExpense, FinancialRecord } from '@prisma/client';

export type FactCategory = 'cashflow' | 'receivables' | 'expenses' | 'trend';
export type FactSeverity = 'info' | 'warning' | 'critical';

/**
 * A fact carries BOTH shapes on purpose:
 *   • `id` doubles as the translation key under the `facts` namespace, and
 *     `values` holds the raw numbers — so any consumer can compose the sentence
 *     itself (e.g. a React view via next-intl `t(...)`);
 *   • `title`/`description` are already composed IN THE REQUESTED LOCALE, so the
 *     non-React consumers keep working unchanged.
 *
 * Composing here rather than only in the UI is deliberate: three of the four
 * consumers are NOT React — the AI context (src/lib/ai-context.ts) needs a
 * finished sentence to put in the prompt, and the PDF report
 * (src/lib/reports/real-data.ts) renders outside any next-intl provider. Leaving
 * composition to each caller would mean writing the same sentence three times
 * and letting the three copies drift.
 */
export type FinancialFact = {
  /** Also the i18n key: `facts.<id>.title` / `facts.<id>.description`. */
  id: string;
  category: FactCategory;
  severity: FactSeverity;
  title: string;
  description: string;
  /** Raw, unformatted values behind `description` — for AI reasoning or custom rendering. */
  values: Record<string, number | string | string[]>;
};

const MESSAGES: Record<Locale, typeof itMessages> = {
  it: itMessages,
  en: enMessages as typeof itMessages,
};

/**
 * Translator over the `facts` namespace, built from the same message catalogs
 * the app uses. `createTranslator` is the non-React entry point of next-intl: it
 * needs no request context, so it works in a plain server module (unlike
 * `useTranslations`/`getTranslations`). ICU plurals in those messages also
 * replace the hand-rolled "cliente/clienti" ternaries this file used to carry.
 */
function factTranslator(locale: Locale) {
  return createTranslator({
    locale,
    messages: MESSAGES[locale] ?? MESSAGES[defaultLocale],
    namespace: 'facts',
  });
}

type FactT = ReturnType<typeof factTranslator>;

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function sortedMonthly(records: FinancialRecord[], kind: 'REVENUE' | 'COST'): [string, number][] {
  const map = new Map<string, number>();
  for (const r of records) {
    const isRevenue = r.type === 'REVENUE';
    if (kind === 'REVENUE' ? !isRevenue : isRevenue) continue;
    const k = monthKey(r.occurredAt);
    map.set(k, (map.get(k) ?? 0) + r.amount);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function averageOfLastMonths(sorted: [string, number][], n: number): { avg: number; months: string[] } | null {
  if (sorted.length === 0) return null;
  const slice = sorted.slice(-n);
  const avg = slice.reduce((s, [, v]) => s + v, 0) / slice.length;
  return { avg, months: slice.map(([k]) => k) };
}

type Trend = { lastAvg: number; prevAvg: number; change: number; lastMonths: string[]; prevMonths: string[] };

/** Compares the last 3 available months against the 3 before them; needs 6 months of history or skips. */
function trendLast3VsPrev3(sorted: [string, number][]): Trend | null {
  if (sorted.length < 6) return null;
  const prev3 = sorted.slice(-6, -3);
  const last3 = sorted.slice(-3);
  const prevAvg = prev3.reduce((s, [, v]) => s + v, 0) / 3;
  const lastAvg = last3.reduce((s, [, v]) => s + v, 0) / 3;
  if (prevAvg <= 0) return null;
  return {
    lastAvg,
    prevAvg,
    change: (lastAvg - prevAvg) / prevAvg,
    lastMonths: last3.map(([k]) => k),
    prevMonths: prev3.map(([k]) => k),
  };
}

/**
 * Whole days a receivable has been overdue as of `now`, counted on the Italian
 * calendar day (dueDate is stored as an Europe/Rome midnight instant) — 0 if not
 * yet due. Single source of truth for this calculation — reused wherever a
 * day-count is needed (this rule, and the AI context) instead of being
 * recomputed ad hoc. Deliberately independent from `startOfToday`/
 * `effectiveStatus` (server-local midnight), which drive the OPEN/OVERDUE
 * status shown on the Scadenzario page and must not change.
 */
export function daysOverdueOf(dueDate: Date, now: Date): number {
  const today = appDateStartUTC(now);
  const due = appDateStartUTC(dueDate);
  return Math.max(0, Math.floor((today.getTime() - due.getTime()) / 86_400_000));
}

// Rule 1 — overdue receivables: real total + distinct customers + how overdue, in days.
function ruleOverdueReceivables(
  receivables: Receivable[],
  now: Date,
  t: FactT,
  locale: Locale,
): FinancialFact | null {
  const overdue = receivables.filter((r) => effectiveStatus(r, now) === 'OVERDUE');
  if (overdue.length === 0) return null;

  const total = overdue.reduce((s, r) => s + r.amount, 0);
  const distinctCustomers = new Set(overdue.map((r) => r.customerName)).size;
  const daysOverdue = overdue.map((r) => daysOverdueOf(r.dueDate, now));
  const minDaysOverdue = Math.min(...daysOverdue);
  const maxDaysOverdue = Math.max(...daysOverdue);

  return {
    id: 'receivables-overdue',
    category: 'receivables',
    severity: maxDaysOverdue > 60 ? 'critical' : 'warning',
    title: t('receivables-overdue.title'),
    description: t('receivables-overdue.description', {
      distinctCustomers,
      totalOverdue: formatCurrency(total, locale),
      minDaysOverdue,
    }),
    values: { totalOverdue: total, count: overdue.length, distinctCustomers, minDaysOverdue, maxDaysOverdue },
  };
}

// Rule 2 — how much of the outstanding (not-yet-paid) balance is overdue vs still on time.
function ruleOverdueRatio(
  receivables: Receivable[],
  now: Date,
  t: FactT,
  locale: Locale,
): FinancialFact | null {
  const open = receivables.filter((r) => effectiveStatus(r, now) === 'OPEN');
  const overdue = receivables.filter((r) => effectiveStatus(r, now) === 'OVERDUE');
  const openAmount = open.reduce((s, r) => s + r.amount, 0);
  const overdueAmount = overdue.reduce((s, r) => s + r.amount, 0);
  const outstanding = openAmount + overdueAmount;
  if (outstanding === 0) return null;

  const ratio = overdueAmount / outstanding;
  if (ratio <= 0.5) return null;

  return {
    id: 'receivables-overdue-ratio',
    category: 'receivables',
    severity: ratio > 0.75 ? 'critical' : 'warning',
    title: t('receivables-overdue-ratio.title'),
    description: t('receivables-overdue-ratio.description', {
      ratioPercent: Math.round(ratio * 100),
      outstanding: formatCurrency(outstanding, locale),
      overdueAmount: formatCurrency(overdueAmount, locale),
      openAmount: formatCurrency(openAmount, locale),
    }),
    values: { openAmount, overdueAmount, outstanding, ratio },
  };
}

// Rule 6a — a single customer's overdue invoice dominating the overdue total.
function ruleReceivableConcentration(
  receivables: Receivable[],
  now: Date,
  t: FactT,
  locale: Locale,
): FinancialFact | null {
  const overdue = receivables.filter((r) => effectiveStatus(r, now) === 'OVERDUE');
  if (overdue.length < 2) return null;

  const overdueAmount = overdue.reduce((s, r) => s + r.amount, 0);
  if (overdueAmount === 0) return null;

  const largest = overdue.reduce((max, r) => (r.amount > max.amount ? r : max));
  const share = largest.amount / overdueAmount;
  if (share <= 0.4) return null;

  return {
    id: 'concentration-receivable',
    category: 'receivables',
    severity: share > 0.7 ? 'critical' : 'warning',
    title: t('concentration-receivable.title'),
    description: t('concentration-receivable.description', {
      customerName: largest.customerName,
      amount: formatCurrency(largest.amount, locale),
      sharePercent: Math.round(share * 100),
      totalOverdue: formatCurrency(overdueAmount, locale),
    }),
    values: { customerName: largest.customerName, amount: largest.amount, totalOverdue: overdueAmount, share },
  };
}

// Rule 3 — recurring obligations measured against the average income that has to cover them.
function ruleExpensesVsIncome(
  records: FinancialRecord[],
  recurringExpenses: RecurringExpense[],
  t: FactT,
  locale: Locale,
): FinancialFact | null {
  const totals = computeTotals(recurringExpenses);
  if (totals.totalMonthly === 0) return null;

  const window = averageOfLastMonths(sortedMonthly(records, 'REVENUE'), 3);
  if (!window || window.avg <= 0) return null;

  const ratio = totals.totalMonthly / window.avg;
  if (ratio <= 0.3) return null;

  return {
    id: 'expenses-vs-income',
    category: 'cashflow',
    severity: ratio > 0.6 ? 'critical' : 'warning',
    title: t('expenses-vs-income.title'),
    description: t('expenses-vs-income.description', {
      totalMonthlyRecurring: formatCurrency(totals.totalMonthly, locale),
      ratioPercent: Math.round(ratio * 100),
      avgMonthlyIncome: formatCurrency(window.avg, locale),
      monthsCount: window.months.length,
      monthsUsed: window.months.join(', '),
    }),
    values: { totalMonthlyRecurring: totals.totalMonthly, avgMonthlyIncome: window.avg, ratio, monthsUsed: window.months },
  };
}

// Rule 6b — a single vendor dominating the recurring-expense monthly total.
function ruleRecurringExpenseConcentration(
  recurringExpenses: RecurringExpense[],
  t: FactT,
  locale: Locale,
): FinancialFact | null {
  const active = recurringExpenses.filter((e) => e.active);
  if (active.length < 2) return null;

  const totalMonthly = computeTotals(recurringExpenses).totalMonthly;
  if (totalMonthly === 0) return null;

  const withMonthly = active.map((e) => ({ e, monthlyEquivalent: e.frequency === 'YEARLY' ? e.amount / 12 : e.amount }));
  const largest = withMonthly.reduce((max, x) => (x.monthlyEquivalent > max.monthlyEquivalent ? x : max));
  const share = largest.monthlyEquivalent / totalMonthly;
  if (share <= 0.4) return null;

  return {
    id: 'concentration-recurring-expense',
    category: 'expenses',
    severity: share > 0.7 ? 'critical' : 'warning',
    title: t('concentration-recurring-expense.title'),
    description: t('concentration-recurring-expense.description', {
      vendorName: largest.e.vendorName,
      monthlyEquivalent: formatCurrency(largest.monthlyEquivalent, locale),
      sharePercent: Math.round(share * 100),
      totalMonthly: formatCurrency(totalMonthly, locale),
    }),
    values: { vendorName: largest.e.vendorName, monthlyEquivalent: largest.monthlyEquivalent, totalMonthly, share },
  };
}

// Rule 4 — expenses trending up: last 3 months vs the 3 months before, >10% increase.
function ruleExpenseTrend(records: FinancialRecord[], t: FactT, locale: Locale): FinancialFact | null {
  const trend = trendLast3VsPrev3(sortedMonthly(records, 'COST'));
  if (!trend || trend.change <= 0.1) return null;

  return {
    id: 'expenses-trend',
    category: 'trend',
    severity: trend.change > 0.3 ? 'critical' : 'warning',
    title: t('expenses-trend.title'),
    description: t('expenses-trend.description', {
      changePercent: Math.round(trend.change * 100),
      lastAvg: formatCurrency(trend.lastAvg, locale),
      lastMonths: trend.lastMonths.join(', '),
      prevAvg: formatCurrency(trend.prevAvg, locale),
      prevMonths: trend.prevMonths.join(', '),
    }),
    values: { lastAvg: trend.lastAvg, prevAvg: trend.prevAvg, change: trend.change, lastMonths: trend.lastMonths, prevMonths: trend.prevMonths },
  };
}

// Rule 5 — revenue trending down: last 3 months vs the 3 months before, >10% decrease.
function ruleRevenueTrend(records: FinancialRecord[], t: FactT, locale: Locale): FinancialFact | null {
  const trend = trendLast3VsPrev3(sortedMonthly(records, 'REVENUE'));
  if (!trend || trend.change >= -0.1) return null;

  return {
    id: 'revenue-trend',
    category: 'trend',
    severity: trend.change < -0.3 ? 'critical' : 'warning',
    title: t('revenue-trend.title'),
    description: t('revenue-trend.description', {
      changePercent: Math.round(Math.abs(trend.change) * 100),
      lastAvg: formatCurrency(trend.lastAvg, locale),
      lastMonths: trend.lastMonths.join(', '),
      prevAvg: formatCurrency(trend.prevAvg, locale),
      prevMonths: trend.prevMonths.join(', '),
    }),
    values: { lastAvg: trend.lastAvg, prevAvg: trend.prevAvg, change: trend.change, lastMonths: trend.lastMonths, prevMonths: trend.prevMonths },
  };
}

/**
 * Deterministic financial facts for an organization: real numbers computed from
 * FinancialRecord / Receivable / RecurringExpense, no AI and no invented data.
 * Each rule independently skips itself when the underlying data is insufficient.
 *
 * @param locale Language for `title`/`description` AND for number/currency
 *   formatting (€1.234,56 in it, €1,234.56 in en). Defaults to Italian so every
 *   existing call site keeps its previous behaviour. `values` is unaffected —
 *   it always carries raw, unformatted numbers.
 */
export async function getFinancialFacts(
  organizationId: string,
  locale: Locale = defaultLocale,
): Promise<FinancialFact[]> {
  const now = new Date();
  const t = factTranslator(locale);
  const [records, receivables, recurringExpenses] = await Promise.all([
    prisma.financialRecord.findMany({ where: { organizationId } }),
    prisma.receivable.findMany({ where: { organizationId } }),
    prisma.recurringExpense.findMany({ where: { organizationId } }),
  ]);

  const facts = [
    ruleOverdueReceivables(receivables, now, t, locale),
    ruleOverdueRatio(receivables, now, t, locale),
    ruleReceivableConcentration(receivables, now, t, locale),
    ruleExpensesVsIncome(records, recurringExpenses, t, locale),
    ruleRecurringExpenseConcentration(recurringExpenses, t, locale),
    ruleExpenseTrend(records, t, locale),
    ruleRevenueTrend(records, t, locale),
  ];

  return facts.filter((f): f is FinancialFact => f !== null);
}
