'use client';

import { useTranslations } from 'next-intl';

/**
 * Shared pagination footer: "Showing 1-12 of 47 results" + Prev / Page N of M / Next.
 *
 * Markup, styling and i18n keys are lifted verbatim from the pagination already
 * built into `transactions-table.tsx` (finance revenue/costs), so the control
 * looks and reads identically wherever it appears. It is extracted here because
 * that one is welded inside a `<table>`, and the insights page is a card GRID —
 * there was no way to reuse it without restructuring the insights layout.
 *
 * `transactions-table.tsx` deliberately still has its own copy: switching it
 * over would mean touching the finance pages, which this change has no reason
 * to risk. New surfaces should use THIS component; that one can adopt it the
 * next time it is opened for another reason.
 *
 * Uses only pre-existing `common.*` keys (showing / of / results / prev / page /
 * next), already present in both it.json and en.json — no new strings needed.
 */
export function Pagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const t = useTranslations('common');

  // A single page of results needs no controls — showing "Page 1 of 1" with two
  // dead buttons is noise, not information.
  if (total === 0 || totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-xs text-muted-foreground">
      <span className="tabular-nums">
        {t('showing')} {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} {t('of')}{' '}
        {total} {t('results')}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="rounded-md border border-border px-2 py-1 hover:bg-muted disabled:opacity-40"
        >
          {t('prev')}
        </button>
        <span className="px-2 tabular-nums">
          {t('page')} {page} {t('of')} {Math.max(1, totalPages)}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="rounded-md border border-border px-2 py-1 hover:bg-muted disabled:opacity-40"
        >
          {t('next')}
        </button>
      </div>
    </div>
  );
}
