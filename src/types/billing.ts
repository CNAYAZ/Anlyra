/**
 * The causali CreditEntry.reason actually holds. Mirrors CreditReason in
 * @/lib/credits — duplicated here rather than imported, because that module
 * pulls in prisma and this type is consumed by a 'use client' component
 * (settings/billing/page.tsx); importing it there would drag prisma into the
 * browser bundle.
 */
export type CreditHistoryReason =
  | 'monthly_grant'
  | 'purchase'
  | 'ai_call'
  | 'refund'
  | 'signup_grant'
  | 'admin_adjustment';

export type CreditHistoryEntryDTO = {
  id: string;
  delta: number;
  reason: CreditHistoryReason;
  createdAt: string;
};

export type CreditHistoryResponse = {
  entries: CreditHistoryEntryDTO[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  /**
   * True when the sum of EVERY row this org's ledger has ever recorded does
   * not equal its current balance — an organization whose credits predate
   * this ledger, or predate a specific movement type being wired into it.
   * Drives one explanatory line on the page; never a computed number, so
   * nothing here is invented.
   */
  incomplete: boolean;
};
