'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';

type Props = {
  open: boolean;
  rowCount: number;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function HistoryRollbackConfirm({ open, rowCount, pending, onConfirm, onCancel }: Props) {
  const t = useTranslations('dataHistory');

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-md">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-danger/10 text-danger">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <h2 className="font-heading text-lg font-semibold">{t('rollbackConfirmTitle')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('rollbackConfirmMessage').replace('{n}', String(rowCount))}
            </p>
          </div>
          <DialogClose className="rounded p-1 text-muted-foreground hover:text-foreground">✕</DialogClose>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="inline-flex items-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            {t('rollbackCancelButton')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {pending ? t('rollbackInProgress') : t('rollbackConfirmButton')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
