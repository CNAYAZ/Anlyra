'use client';

import { useTranslations } from 'next-intl';
import { useAppLocale } from '@/hooks/use-locale';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Search, RotateCcw } from 'lucide-react';

export type BatchRow = {
  id: string;
  fileName: string | null;
  fileSize: number;
  source: string;
  type: string;
  status: string;
  rowsTotal: number;
  rowsImported: number;
  rowsErrors: number;
  createdAt: string | Date;
};

const STATUS_BADGE: Record<string, string> = {
  COMPLETED: 'bg-success/10 text-success border-success/40',
  COMPLETED_WITH_ERRORS: 'bg-warning/10 text-warning border-warning/40',
  PROCESSING: 'bg-primary-accent/10 text-primary-accent border-primary-accent/30',
  FAILED: 'bg-danger/10 text-danger border-danger/40',
  ROLLED_BACK: 'bg-muted text-muted-foreground border-border',
  PENDING: 'bg-muted text-muted-foreground border-border',
};

type Props = {
  batches: BatchRow[];
  onViewDetail: (id: string) => void;
  onRollback: (id: string) => void;
};

export function HistoryTable({ batches, onViewDetail, onRollback }: Props) {
  const t = useTranslations('dataHistory');
  const locale = useAppLocale();

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left">{t('columnDate')}</th>
            <th className="px-4 py-3 text-left">{t('columnType')}</th>
            <th className="px-4 py-3 text-left">{t('columnTarget')}</th>
            <th className="px-4 py-3 text-left">{t('columnRows')}</th>
            <th className="px-4 py-3 text-left">{t('columnStatus')}</th>
            <th className="px-4 py-3 text-right">{t('columnActions')}</th>
          </tr>
        </thead>
        <tbody>
          {batches.map((b) => (
            <tr key={b.id} className="border-t border-border hover:bg-muted/40">
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {formatDate(b.createdAt instanceof Date ? b.createdAt.toISOString() : b.createdAt, locale)}
              </td>
              <td className="px-4 py-3">
                <span className={cn(
                  'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase',
                  b.source === 'manual'
                    ? 'border-primary-accent/30 bg-primary-accent/10 text-primary-accent'
                    : 'border-border bg-muted text-muted-foreground',
                )}>
                  {b.source === 'manual' ? t('sourceManual') : t('sourceFile')}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="font-mono text-xs">{b.type}</span>
                {b.fileName && (
                  <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">{b.fileName}</p>
                )}
              </td>
              <td className="px-4 py-3">
                <span className="text-success font-medium">{b.rowsImported}</span>
                <span className="text-muted-foreground"> / {b.rowsTotal}</span>
                {b.rowsErrors > 0 && (
                  <span className="ml-1 text-danger text-xs">({b.rowsErrors} err)</span>
                )}
              </td>
              <td className="px-4 py-3">
                <span className={cn(
                  'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase',
                  STATUS_BADGE[b.status] ?? STATUS_BADGE.PENDING,
                )}>
                  {t(('status' + b.status.charAt(0) + b.status.slice(1).toLowerCase().replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())) as 'statusCompleted')}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => onViewDetail(b.id)}
                    title={t('viewDetail')}
                    className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Search className="h-3.5 w-3.5" />
                  </button>
                  {b.status !== 'ROLLED_BACK' && (
                    <button
                      type="button"
                      onClick={() => onRollback(b.id)}
                      title={t('rollback')}
                      className="rounded p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
