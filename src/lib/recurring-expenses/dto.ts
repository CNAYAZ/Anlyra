import type { RecurringExpense } from '@prisma/client';
import type {
  RecurringExpenseDTO,
  ExpenseFrequency,
  RecurringExpenseTotals,
} from '@/types/recurring-expense';

export function toRecurringExpenseDTO(row: RecurringExpense): RecurringExpenseDTO {
  return {
    id: row.id,
    vendorName: row.vendorName,
    amount: row.amount,
    currency: row.currency,
    frequency: (row.frequency === 'YEARLY' ? 'YEARLY' : 'MONTHLY') as ExpenseFrequency,
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
 *   - a MONTHLY expense contributes `amount` per month and `amount × 12` per year
 *   - a YEARLY expense contributes `amount / 12` per month and `amount` per year
 */
export function computeTotals(
  rows: { amount: number; frequency: string; active: boolean }[],
): RecurringExpenseTotals {
  let totalMonthly = 0;
  let totalYearly = 0;
  for (const r of rows) {
    if (!r.active) continue;
    if (r.frequency === 'YEARLY') {
      totalMonthly += r.amount / 12;
      totalYearly += r.amount;
    } else {
      totalMonthly += r.amount;
      totalYearly += r.amount * 12;
    }
  }
  return { totalMonthly, totalYearly };
}
