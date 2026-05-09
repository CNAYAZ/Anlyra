'use client';

import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

type BatchDetail = {
  batch: Record<string, unknown>;
  records: Record<string, unknown>[];
  errors: { row: number; field?: string; message: string }[];
};

type ApiResult<T> = { success: true; data: T } | { success: false; error: string };

type Props = {
  batchId: string | null;
  onClose: () => void;
  onRollback: (id: string) => void;
};

export function HistoryDetailDialog({ batchId, onClose, onRollback }: Props) {
  const t = useTranslations('dataHistory');
  const open = batchId !== null;

  const { data, isLoading } = useQuery({
    queryKey: ['batch-detail', batchId],
    queryFn: async () => {
      const res = await fetch(`/api/data/import/batches/${batchId}`);
      const body = (await res.json()) as ApiResult<BatchDetail>;
      if (!body.success) throw new Error(body.error);
      return body.data;
    },
    enabled: open && batchId !== null,
  });

  const batch = data?.batch;
  const status = batch?.status as string | undefined;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-heading text-lg font-semibold">
            {batch ? String(batch.fileName ?? t('sourceManual')) : '—'}
          </h2>
          <DialogClose className="rounded p-1 text-muted-foreground hover:text-foreground">✕</DialogClose>
        </div>

        {isLoading ? (
          <div className="space-y-2 pt-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 rounded" />)}
          </div>
        ) : !data ? null : (
          <>
            <Tabs defaultValue="records" className="mt-4">
              <TabsList>
                <TabsTrigger value="records">{t('detailTabRecords')} ({data.records.length})</TabsTrigger>
                <TabsTrigger value="errors">{t('detailTabErrors')} ({data.errors.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="records" className="mt-3">
                {data.records.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">{t('detailNoRecords')}</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-xs">
                      <thead className="bg-muted text-muted-foreground">
                        <tr>
                          {Object.keys(data.records[0]).filter(k => k !== '_type' && k !== 'organizationId' && k !== 'importBatchId' && k !== 'importId').map(k => (
                            <th key={k} className="px-3 py-2 text-left font-medium uppercase">{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.records.slice(0, 100).map((r, i) => (
                          <tr key={i} className="border-t border-border">
                            {Object.entries(r).filter(([k]) => k !== '_type' && k !== 'organizationId' && k !== 'importBatchId' && k !== 'importId').map(([k, v]) => (
                              <td key={k} className="px-3 py-2 max-w-[200px] truncate">{v === null || v === undefined ? '—' : String(v)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="errors" className="mt-3">
                {data.errors.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">{t('detailNoErrors')}</p>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-border">
                    <table className="w-full text-xs">
                      <thead className="bg-muted text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 text-left">#</th>
                          <th className="px-3 py-2 text-left">{t('rollbackConfirmMessage')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.errors.map((e, i) => (
                          <tr key={i} className="border-t border-border">
                            <td className="px-3 py-2">{e.row}</td>
                            <td className="px-3 py-2 text-danger">{e.field ? `[${e.field}] ` : ''}{e.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {status && status !== 'ROLLED_BACK' && (
              <div className="mt-4 flex justify-end border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => { if (batchId) { onRollback(batchId); onClose(); } }}
                  className="inline-flex items-center gap-2 rounded-lg border border-danger/40 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10"
                >
                  <RotateCcw className="h-4 w-4" /> {t('rollback')}
                </button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
