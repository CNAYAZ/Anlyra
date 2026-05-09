'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { CheckCircle2, AlertTriangle, XCircle, RotateCcw, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ImportBatchResult = {
  id: string;
  fileName: string;
  type: string;
  status: string;
  rowsTotal: number;
  rowsImported: number;
  rowsErrors: number;
  errors: { row: number; field?: string; message: string }[];
};

type Props = {
  result: ImportBatchResult;
  onReset: () => void;
};

export function ImportResult({ result, onReset }: Props) {
  const t = useTranslations('dataImport');
  const failed = result.status === 'FAILED';
  const partial = result.status === 'COMPLETED_WITH_ERRORS';
  const ok = result.status === 'COMPLETED';

  return (
    <div className="space-y-4">
      <div
        className={cn(
          'card flex items-start gap-4',
          ok && 'border-success/40 bg-success/5',
          partial && 'border-warning/40 bg-warning/5',
          failed && 'border-danger/40 bg-danger/5',
        )}
      >
        <span
          className={cn(
            'grid h-12 w-12 shrink-0 place-items-center rounded-xl',
            ok && 'bg-success/10 text-success',
            partial && 'bg-warning/10 text-warning',
            failed && 'bg-danger/10 text-danger',
          )}
        >
          {ok ? <CheckCircle2 className="h-6 w-6" /> : partial ? <AlertTriangle className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
        </span>
        <div className="flex-1 space-y-2">
          <div>
            <h2 className="font-heading text-lg font-semibold">
              {ok ? t('resultSuccess') : partial ? t('resultPartial') : t('resultFailed')}
            </h2>
            <p className="text-sm text-muted-foreground">{result.fileName}</p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <span>
              <strong className="font-heading text-2xl">{result.rowsImported}</strong>{' '}
              <span className="text-muted-foreground">/ {result.rowsTotal}</span>{' '}
              <span className="text-muted-foreground">{t('resultRowsImported')}</span>
            </span>
            {result.rowsErrors > 0 && (
              <span>
                <strong className="font-heading text-2xl text-danger">{result.rowsErrors}</strong>{' '}
                <span className="text-muted-foreground">{t('resultErrors')}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {result.errors.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">{t('resultErrors')}</h3>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">{t('resultErrorField')}</th>
                  <th className="px-3 py-2 text-left">{t('resultErrorMessage')}</th>
                </tr>
              </thead>
              <tbody>
                {result.errors.slice(0, 50).map((e, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2 text-xs text-muted-foreground">{e.row}</td>
                    <td className="px-3 py-2 text-xs">{e.field ?? '—'}</td>
                    <td className="px-3 py-2 text-xs text-danger">{e.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <RotateCcw className="h-4 w-4" /> {t('resultNewImport')}
        </button>
        <Link
          href="/data/history"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          <ListChecks className="h-4 w-4" /> {t('resultViewHistory')}
        </Link>
      </div>
    </div>
  );
}
