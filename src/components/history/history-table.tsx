'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LoadingState, EmptyState, ErrorState } from '@/components/common/states';
import { formatDateTime } from '@/lib/format';
import type { Locale } from '@/i18n/config';
import { getJson, postJson } from '@/lib/fetcher';
import { useToast } from '@/components/ui/toaster';

type Status = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK';

type ImportRow = {
  id: string;
  fileName: string;
  type: 'REVENUE' | 'COST' | 'KPI' | 'COMPETITOR';
  rowsTotal: number;
  rowsImported: number;
  rowsErrors: number;
  status: Status;
  createdAt: string;
};

const statusVariant: Record<Status, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  PENDING: 'neutral',
  PROCESSING: 'info',
  COMPLETED: 'success',
  FAILED: 'danger',
  ROLLED_BACK: 'warning',
};

export function HistoryTable({ locale }: { locale: Locale }) {
  const t = useTranslations('history');
  const tCols = useTranslations('history.columns');
  const tStatus = useTranslations('history.status');
  const tActions = useTranslations('history.actions');
  const tImport = useTranslations('import');
  const common = useTranslations('common');
  const { toast } = useToast();

  const [items, setItems] = React.useState<ImportRow[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [target, setTarget] = React.useState<ImportRow | null>(null);
  const [rollbackTarget, setRollbackTarget] = React.useState<ImportRow | null>(null);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    setError(null);
    setItems(null);
    try {
      const data = await getJson<{ items: ImportRow[] }>('/api/data/history');
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'error');
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const rollback = async () => {
    if (!rollbackTarget) return;
    setBusy(true);
    try {
      await postJson(`/api/data/rollback/${rollbackTarget.id}`, {});
      toast({ title: tActions('rollbackSuccess'), variant: 'success' });
      setRollbackTarget(null);
      await load();
    } catch (err) {
      toast({
        title: tActions('rollbackError'),
        description: err instanceof Error ? err.message : undefined,
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  if (items === null && !error) return <LoadingState />;
  if (error) return <ErrorState description={error} onRetry={load} />;
  if (items && items.length === 0) return <EmptyState description={t('empty')} />;

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{tCols('date')}</TableHead>
            <TableHead>{tCols('file')}</TableHead>
            <TableHead>{tCols('type')}</TableHead>
            <TableHead>{tCols('rows')}</TableHead>
            <TableHead>{tCols('errors')}</TableHead>
            <TableHead>{tCols('status')}</TableHead>
            <TableHead className="text-right">{tCols('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items?.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="num whitespace-nowrap">
                {formatDateTime(row.createdAt, locale)}
              </TableCell>
              <TableCell className="max-w-[220px] truncate">{row.fileName}</TableCell>
              <TableCell>
                <Badge variant="info">
                  {row.type === 'REVENUE'
                    ? tImport('targetRevenue')
                    : row.type === 'COST'
                      ? tImport('targetCost')
                      : row.type === 'KPI'
                        ? tImport('targetKpi')
                        : tImport('targetCompetitor')}
                </Badge>
              </TableCell>
              <TableCell className="num">
                {row.rowsImported} / {row.rowsTotal}
              </TableCell>
              <TableCell className="num">{row.rowsErrors}</TableCell>
              <TableCell>
                <Badge variant={statusVariant[row.status]}>
                  {tStatus(row.status)}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setTarget(row)}>
                    {tActions('details')}
                  </Button>
                  {row.status === 'COMPLETED' ? (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setRollbackTarget(row)}
                    >
                      {tActions('rollback')}
                    </Button>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{target?.fileName}</DialogTitle>
            <DialogDescription>
              {target ? formatDateTime(target.createdAt, locale) : null}
            </DialogDescription>
          </DialogHeader>
          {target ? (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt className="text-muted-foreground">{tCols('type')}</dt>
              <dd>{target.type}</dd>
              <dt className="text-muted-foreground">{tCols('rows')}</dt>
              <dd className="num">
                {target.rowsImported} / {target.rowsTotal}
              </dd>
              <dt className="text-muted-foreground">{tCols('errors')}</dt>
              <dd className="num">{target.rowsErrors}</dd>
              <dt className="text-muted-foreground">{tCols('status')}</dt>
              <dd>
                <Badge variant={statusVariant[target.status]}>
                  {tStatus(target.status)}
                </Badge>
              </dd>
            </dl>
          ) : null}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setTarget(null)}>
              {common('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!rollbackTarget}
        onOpenChange={(o) => !o && !busy && setRollbackTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tActions('rollbackConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {rollbackTarget
                ? tActions('rollbackConfirmDescription', {
                    count: rollbackTarget.rowsImported,
                  })
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setRollbackTarget(null)}
              disabled={busy}
            >
              {common('cancel')}
            </Button>
            <Button variant="danger" onClick={rollback} disabled={busy}>
              {tActions('rollback')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
