export type ExpenseFrequency = 'MONTHLY' | 'YEARLY';

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
