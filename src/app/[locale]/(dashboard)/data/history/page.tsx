'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Skeleton } from '@/components/ui/skeleton';
import { HistoryFilters, type HistoryFilters as HistoryFiltersType } from '@/components/data/history-filters';
import { HistoryTable, type BatchRow } from '@/components/data/history-table';
import { HistoryDetailDialog } from '@/components/data/history-detail-dialog';
import { HistoryRollbackConfirm } from '@/components/data/history-rollback-confirm';

type ApiResult<T> = { success: true; data: T } | { success: false; error: string };

async function fetchBatches(filters: HistoryFiltersType): Promise<BatchRow[]> {
  const sp = new URLSearchParams();
  if (filters.source !== 'all') sp.set('source', filters.source);
  if (filters.status !== 'all') sp.set('status', filters.status);
  if (filters.from) sp.set('from', filters.from);
  if (filters.to) sp.set('to', filters.to);
  const res = await fetch(`/api/data/import/batches?${sp.toString()}`);
  const body = (await res.json()) as ApiResult<{ batches: BatchRow[] }>;
  if (!body.success) throw new Error(body.error);
  return body.data.batches;
}

async function rollbackBatch(id: string): Promise<void> {
  const res = await fetch(`/api/data/import/batches/${id}`, { method: 'DELETE' });
  const body = (await res.json()) as ApiResult<unknown>;
  if (!body.success) throw new Error(body.error);
}

export default function DataHistoryPage() {
  const t = useTranslations('dataHistory');
  const qc = useQueryClient();
  const [filters, setFilters] = useState<HistoryFiltersType>({ source: 'all', status: 'all', from: '', to: '' });
  const [detailId, setDetailId] = useState<string | null>(null);
  const [rollbackTarget, setRollbackTarget] = useState<string | null>(null);

  const { data: batches, isLoading, isError, refetch } = useQuery({
    queryKey: ['batches', filters],
    queryFn: () => fetchBatches(filters),
  });

  const rollbackMutation = useMutation({
    mutationFn: () => rollbackBatch(rollbackTarget!),
    onSuccess: () => {
      setRollbackTarget(null);
      qc.invalidateQueries({ queryKey: ['batches'] });
      qc.invalidateQueries({ queryKey: ['batch-detail', rollbackTarget] });
    },
  });

  function handleRollbackRequest(id: string) {
    setRollbackTarget(id);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <HistoryFilters filters={filters} onChange={setFilters} />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
        </div>
      ) : isError ? (
        <div className="card text-sm text-danger">
          {t('error')}{' '}
          <button type="button" onClick={() => refetch()} className="underline">{t('retry')}</button>
        </div>
      ) : !batches || batches.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
          {t('empty')}
        </div>
      ) : (
        <HistoryTable
          batches={batches}
          onViewDetail={setDetailId}
          onRollback={handleRollbackRequest}
        />
      )}

      <HistoryDetailDialog
        batchId={detailId}
        onClose={() => setDetailId(null)}
        onRollback={handleRollbackRequest}
      />

      <HistoryRollbackConfirm
        open={rollbackTarget !== null}
        rowCount={batches?.find((b) => b.id === rollbackTarget)?.rowsImported ?? 0}
        pending={rollbackMutation.isPending}
        onConfirm={() => rollbackMutation.mutate()}
        onCancel={() => setRollbackTarget(null)}
      />
    </div>
  );
}
