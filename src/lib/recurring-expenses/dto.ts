import type { RecurringExpense } from '@prisma/client';
import {
  EXPENSE_FREQUENCIES,
  FREQUENCY_MONTHS,
  type RecurringExpenseDTO,
  type ExpenseFrequency,
  type RecurringExpenseTotals,
} from '@/types/recurring-expense';

/** A stored frequency, read back; anything unknown is treated as MONTHLY, as before. */
export function toExpenseFrequency(value: string): ExpenseFrequency {
  return (EXPENSE_FREQUENCIES as readonly string[]).includes(value) ? (value as ExpenseFrequency) : 'MONTHLY';
}

/**
 * What one expense costs per month: the amount divided by the months one
 * payment covers (2 for bimonthly, 3 quarterly, 6 semiannual, 12 yearly).
 * The ONE place this is computed — totals, the facts engine and the AI
 * context all use it.
 */
export function monthlyEquivalent(amount: number, frequency: string): number {
  return amount / FREQUENCY_MONTHS[toExpenseFrequency(frequency)];
}

export function toRecurringExpenseDTO(row: RecurringExpense): RecurringExpenseDTO {
  return {
    id: row.id,
    vendorName: row.vendorName,
    amount: row.amount,
    currency: row.currency,
    frequency: toExpenseFrequency(row.frequency),
    category: row.category,
    nextRenewal: row.nextRenewal ? row.nextRenewal.toISOString() : null,
    active: row.active,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Normalise recurring spend to a comparable monthly and yearly figure across
 * ALL active expenses (inactive/cancelled ones are excluded):
 *   - per month: `amount / months`, where months is what one payment covers
 *     (1 monthly, 2 bimonthly, 3 quarterly, 6 semiannual, 12 yearly)
 *   - per year: `amount × (12 / months)` — the number of payments in a year
 */
export function computeTotals(
  rows: { amount: number; frequency: string; active: boolean }[],
): RecurringExpenseTotals {
  let totalMonthly = 0;
  let totalYearly = 0;
  for (const r of rows) {
    if (!r.active) continue;
    const months = FREQUENCY_MONTHS[toExpenseFrequency(r.frequency)];
    totalMonthly += r.amount / months;
    totalYearly += r.amount * (12 / months);
  }
  return { totalMonthly, totalYearly };
}
