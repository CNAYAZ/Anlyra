'use client';

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate, type Locale } from '@/lib/utils';

export type TxRow = {
  id: string;
  date: string;
  category: string;
  subcategory?: string;
  amount: number;
  description?: string | null;
  source: string;
};

export type SortKey = 'date' | 'amount' | 'category';
export type SortOrder = 'asc' | 'desc';

export function TransactionsTable({
  rows,
  locale,
  sortBy,
  sortOrder,
  onSort,
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  amountTone = 'neutral',
}: {
  rows: TxRow[];
  locale: Locale;
  sortBy: SortKey;
  sortOrder: SortOrder;
  onSort: (key: SortKey) => void;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  amountTone?: 'positive' | 'negative' | 'neutral';
}) {
  const t = useTranslations('common');

  const header = (label: string, key: SortKey) => {
    const active = sortBy === key;
    const Icon = !active ? ArrowUpDown : sortOrder === 'asc' ? ArrowUp : ArrowDown;
    return (
      <button onClick={() => onSort(key)} className="flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-50">
        {label}
        <Icon className={cn('w-3 h-3', active ? 'opacity-100' : 'opacity-40')} />
      </button>
    );
  };

  const amountClass =
    amountTone === 'positive' ? 'text-success' : amountTone === 'negative' ? 'text-danger' : 'text-slate-900 dark:text-slate-50';

  return (
    <div className="card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="text-left px-4 py-3">{header(t('date'), 'date')}</th>
              <th className="text-left px-4 py-3">{header(t('category'), 'category')}</th>
              <th className="text-left px-4 py-3">{t('description')}</th>
              <th className="text-left px-4 py-3">{t('source')}</th>
              <th className="text-right px-4 py-3">{header(t('amount'), 'amount')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-slate-500 py-8">
                  {t('empty')}
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                <td className="px-4 py-3 whitespace-nowrap num text-slate-600 dark:text-slate-300">{formatDate(r.date, locale)}</td>
                <td className="px-4 py-3 capitalize">{r.category.replace(/_/g, ' ')}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300 truncate max-w-[280px]">{r.description ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className="chip bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase">{r.source}</span>
                </td>
                <td className={cn('px-4 py-3 text-right num font-medium', amountClass)}>{formatCurrency(r.amount, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
        <span>
          {t('showing')} {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} {t('of')} {total} {t('results')}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {t('prev')}
          </button>
          <span className="px-2">
            {t('page')} {page} {t('of')} {Math.max(1, totalPages)}
          </span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {t('next')}
          </button>
        </div>
      </div>
    </div>
  );
}
