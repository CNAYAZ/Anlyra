import type { Receivable } from '@prisma/client';
import type { ReceivableDTO, ReceivableStatus } from '@/types/receivable';

/** Midnight at the start of `now`'s day — used so an invoice due *today* is not overdue. */
export function startOfToday(now: Date = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Effective status of a receivable. PAID is terminal; anything else (OPEN, or a
 * previously persisted OVERDUE) is recomputed from dueDate so the badge always
 * reflects reality without a background job.
 */
export function effectiveStatus(
  row: { status: string; dueDate: Date },
  now: Date = new Date(),
): ReceivableStatus {
  if (row.status === 'PAID') return 'PAID';
  return row.dueDate < startOfToday(now) ? 'OVERDUE' : 'OPEN';
}

export function toReceivableDTO(row: Receivable, now: Date = new Date()): ReceivableDTO {
  return {
    id: row.id,
    customerName: row.customerName,
    amount: row.amount,
    currency: row.currency,
    invoiceNumber: row.invoiceNumber,
    issuedDate: row.issuedDate ? row.issuedDate.toISOString() : null,
    dueDate: row.dueDate.toISOString(),
    status: effectiveStatus(row, now),
    notes: row.notes,
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}
