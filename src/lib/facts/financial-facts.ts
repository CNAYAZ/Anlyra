import { prisma } from '@/lib/prisma';
import { formatCurrency } from '@/lib/format';
import { effectiveStatus, startOfToday } from '@/lib/receivables/dto';
import { computeTotals } from '@/lib/recurring-expenses/dto';
import type { Locale } from '@/i18n/config';
import type { Receivable, RecurringExpense, FinancialRecord } from '@prisma/client';

export type FactCategory = 'cashflow' | 'receivables' | 'expenses' | 'trend';
export type FactSeverity = 'info' | 'warning' | 'critical';

/** Raw values behind `description`, kept numeric/string so a future AI layer can reason over them. */
export type FinancialFact = {
  id: string;
  category: FactCategory;
  severity: FactSeverity;
  title: string;
  description: string;
  values: Record<string, number | string | string[]>;
};

const LOCALE: Locale = 'it';

function money(value: number): string {
  return formatCurrency(value, LOCALE);
}

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
 * Whole days a receivable has been overdue as of `now`; 0 if not yet due.
 * Single source of truth for this calculation — reused wherever a day-count is
 * needed (this rule, and the AI context) instead of being recomputed ad hoc.
 */
export function daysOverdueOf(dueDate: Date, now: Date): number {
  const today = startOfToday(now);
  return Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / 86_400_000));
}

// Rule 1 — overdue receivables: real total + distinct customers + how overdue, in days.
function ruleOverdueReceivables(receivables: Receivable[], now: Date): FinancialFact | null {
  const overdue = receivables.filter((r) => effectiveStatus(r, now) === 'OVERDUE');
  if (overdue.length === 0) return null;

  const total = overdue.reduce((s, r) => s + r.amount, 0);
  const distinctCustomers = new Set(overdue.map((r) => r.customerName)).size;
  const daysOverdue = overdue.map((r) => daysOverdueOf(r.dueDate, now));
  const minDaysOverdue = Math.min(...daysOverdue);
  const maxDaysOverdue = Math.max(...daysOverdue);
  const customerWord = distinctCustomers === 1 ? 'cliente' : 'clienti';
  const verb = distinctCustomers === 1 ? 'deve' : 'devono';

  return {
    id: 'receivables-overdue',
    category: 'receivables',
    severity: maxDaysOverdue > 60 ? 'critical' : 'warning',
    title: 'Crediti scaduti',
    description: `${distinctCustomers} ${customerWord} ti ${verb} ${money(total)} da oltre ${minDaysOverdue} giorni.`,
    values: { totalOverdue: total, count: overdue.length, distinctCustomers, minDaysOverdue, maxDaysOverdue },
  };
}

// Rule 2 — how much of the outstanding (not-yet-paid) balance is overdue vs still on time.
function ruleOverdueRatio(receivables: Receivable[], now: Date): FinancialFact | null {
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
    title: 'Quota crediti scaduti elevata',
    description: `Il ${Math.round(ratio * 100)}% del totale crediti da incassare (${money(outstanding)}) è scaduto (${money(overdueAmount)}); solo ${money(openAmount)} è ancora nei termini.`,
    values: { openAmount, overdueAmount, outstanding, ratio },
  };
}

// Rule 6a — a single customer's overdue invoice dominating the overdue total.
function ruleReceivableConcentration(receivables: Receivable[], now: Date): FinancialFact | null {
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
    title: 'Concentrazione su un singolo credito scaduto',
    description: `Il credito scaduto di ${largest.customerName} (${money(largest.amount)}) è il ${Math.round(share * 100)}% del totale crediti scaduti (${money(overdueAmount)}).`,
    values: { customerName: largest.customerName, amount: largest.amount, totalOverdue: overdueAmount, share },
  };
}

// Rule 3 — recurring obligations measured against the average income that has to cover them.
function ruleExpensesVsIncome(records: FinancialRecord[], recurringExpenses: RecurringExpense[]): FinancialFact | null {
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
    title: 'Spese ricorrenti vicine alle entrate',
    description: `Le spese ricorrenti mensili (${money(totals.totalMonthly)}) assorbono il ${Math.round(ratio * 100)}% delle entrate medie mensili (${money(window.avg)}, calcolate su ${window.months.length} mes${window.months.length === 1 ? 'e' : 'i'}: ${window.months.join(', ')}).`,
    values: { totalMonthlyRecurring: totals.totalMonthly, avgMonthlyIncome: window.avg, ratio, monthsUsed: window.months },
  };
}

// Rule 6b — a single vendor dominating the recurring-expense monthly total.
function ruleRecurringExpenseConcentration(recurringExpenses: RecurringExpense[]): FinancialFact | null {
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
    title: 'Concentrazione su una singola spesa ricorrente',
    description: `La spesa ricorrente di ${largest.e.vendorName} (${money(largest.monthlyEquivalent)}/mese) è il ${Math.round(share * 100)}% del totale spese ricorrenti mensili (${money(totalMonthly)}).`,
    values: { vendorName: largest.e.vendorName, monthlyEquivalent: largest.monthlyEquivalent, totalMonthly, share },
  };
}

// Rule 4 — expenses trending up: last 3 months vs the 3 months before, >10% increase.
function ruleExpenseTrend(records: FinancialRecord[]): FinancialFact | null {
  const trend = trendLast3VsPrev3(sortedMonthly(records, 'COST'));
  if (!trend || trend.change <= 0.1) return null;

  return {
    id: 'expenses-trend',
    category: 'trend',
    severity: trend.change > 0.3 ? 'critical' : 'warning',
    title: 'Spese in aumento',
    description: `Le spese sono aumentate del ${Math.round(trend.change * 100)}% negli ultimi 3 mesi (${money(trend.lastAvg)}/mese: ${trend.lastMonths.join(', ')}) rispetto ai 3 mesi precedenti (${money(trend.prevAvg)}/mese: ${trend.prevMonths.join(', ')}).`,
    values: { lastAvg: trend.lastAvg, prevAvg: trend.prevAvg, change: trend.change, lastMonths: trend.lastMonths, prevMonths: trend.prevMonths },
  };
}

// Rule 5 — revenue trending down: last 3 months vs the 3 months before, >10% decrease.
function ruleRevenueTrend(records: FinancialRecord[]): FinancialFact | null {
  const trend = trendLast3VsPrev3(sortedMonthly(records, 'REVENUE'));
  if (!trend || trend.change >= -0.1) return null;

  return {
    id: 'revenue-trend',
    category: 'trend',
    severity: trend.change < -0.3 ? 'critical' : 'warning',
    title: 'Ricavi in calo',
    description: `I ricavi sono diminuiti del ${Math.round(Math.abs(trend.change) * 100)}% negli ultimi 3 mesi (${money(trend.lastAvg)}/mese: ${trend.lastMonths.join(', ')}) rispetto ai 3 mesi precedenti (${money(trend.prevAvg)}/mese: ${trend.prevMonths.join(', ')}).`,
    values: { lastAvg: trend.lastAvg, prevAvg: trend.prevAvg, change: trend.change, lastMonths: trend.lastMonths, prevMonths: trend.prevMonths },
  };
}

/**
 * Deterministic financial facts for an organization: real numbers computed from
 * FinancialRecord / Receivable / RecurringExpense, no AI and no invented data.
 * Each rule independently skips itself when the underlying data is insufficient.
 */
export async function getFinancialFacts(organizationId: string): Promise<FinancialFact[]> {
  const now = new Date();
  const [records, receivables, recurringExpenses] = await Promise.all([
    prisma.financialRecord.findMany({ where: { organizationId } }),
    prisma.receivable.findMany({ where: { organizationId } }),
    prisma.recurringExpense.findMany({ where: { organizationId } }),
  ]);

  const facts = [
    ruleOverdueReceivables(receivables, now),
    ruleOverdueRatio(receivables, now),
    ruleReceivableConcentration(receivables, now),
    ruleExpensesVsIncome(records, recurringExpenses),
    ruleRecurringExpenseConcentration(recurringExpenses),
    ruleExpenseTrend(records),
    ruleRevenueTrend(records),
  ];

  return facts.filter((f): f is FinancialFact => f !== null);
}
