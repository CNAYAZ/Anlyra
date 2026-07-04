export type ReceivableStatus = 'OPEN' | 'PAID' | 'OVERDUE';

/** Reminder tones mirror src/lib/reminders/generate.ts ReminderTone. */
export type ReminderTone = 'cortese' | 'neutro' | 'fermo' | 'sollecito_finale';

export type ReceivableDTO = {
  id: string;
  customerName: string;
  customerEmail: string | null;
  amount: number;
  currency: string;
  invoiceNumber: string | null;
  issuedDate: string | null;
  dueDate: string;
  /** Effective status: PAID, or OVERDUE/OPEN derived from dueDate at read time. */
  status: ReceivableStatus;
  notes: string | null;
  paidAt: string | null;
  createdAt: string;
};

export type ReceivableTotals = {
  open: number;
  overdue: number;
  /** Sum of `amount` across OPEN / OVERDUE rows, mixed currencies summed as-is. */
  openAmount: number;
  overdueAmount: number;
  /**
   * Total still to be collected = every unpaid receivable (OPEN + OVERDUE).
   * openAmount alone excludes overdue rows (statuses are mutually exclusive), so
   * this is the figure to show as "total outstanding"; overdueAmount ≤ this always.
   */
  outstandingAmount: number;
};

export type ReminderVariantDTO = {
  tone: ReminderTone;
  subject: string;
  body: string;
  daysOverdue: number;
};

export type ReminderResponse = {
  variants: ReminderVariantDTO[];
};
