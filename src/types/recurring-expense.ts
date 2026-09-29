/**
 * How often a recurring expense is paid. The Italian cadences of bills,
 * accountants and taxes (founder's decision): monthly, every two months,
 * quarterly, every six months, yearly. Stored as plain text in
 * RecurringExpense.frequency — no enum in the database, so adding one needs
 * no migration.
 */
export const EXPENSE_FREQUENCIES = ['MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'YEARLY'] as const;

export type ExpenseFrequency = (typeof EXPENSE_FREQUENCIES)[number];

/** Months covered by one payment: the monthly equivalent is amount / months. */
export const FREQUENCY_MONTHS: Record<ExpenseFrequency, number> = {
  MONTHLY: 1,
  BIMONTHLY: 2,
  QUARTERLY: 3,
  SEMIANNUAL: 6,
  YEARLY: 12,
};

export type RecurringExpenseDTO = {
  id: string;
  vendorName: string;
  amount: number;
  currency: string;
  frequency: ExpenseFrequency;
  category: string | null;
  nextRenewal: string | null;
  active: boolean;
  notes: string | null;
  createdAt: string;
};

export type RecurringExpenseTotals = {
  /** Normalised monthly spend across ACTIVE expenses (yearly amounts / 12). */
  totalMonthly: number;
  /** Normalised yearly spend across ACTIVE expenses (monthly amounts × 12). */
  totalYearly: number;
};
