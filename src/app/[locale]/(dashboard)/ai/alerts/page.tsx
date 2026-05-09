'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AlertCard } from '@/components/ai/alert-card';
import { AlertDetail } from '@/components/ai/alert-detail';
import { AlertFilters, type AlertFilterValues } from '@/components/ai/alert-filters';
import { PageHeader } from '@/components/ui/section';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState, EmptyState } from '@/components/ui/state';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api/fetcher';
import { usePlan } from '@/lib/billing/context';
import type { AlertDTO, AlertStatus } from '@/types/ai';

export default function AlertsPage() {
  const t = useTranslations('alerts');
  const { aiCreditsBalance } = usePlan();
  const qc = useQueryClient();

  const [filters, setFilters] = useState<AlertFilterValues>({
    severity: 'ALL',
    status: 'ALL',
  });
  const [selected, setSelected] = useState<AlertDTO | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const canGenerateAi = aiCreditsBalance >= 3;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['alerts', filters.severity, filters.status],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.severity !== 'ALL') params.set('severity', filters.severity);
      if (filters.status !== 'ALL') params.set('status', filters.status);
      const q = params.toString() ? `?${params.toString()}` : '';
      return apiFetch<{ alerts: AlertDTO[]; newCount: number }>(`/api/ai/alerts${q}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AlertStatus }) =>
      apiFetch<{ alert: AlertDTO }>(`/api/ai/alerts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ['alerts'] });
      const queryKey = ['alerts', filters.severity, filters.status];
      const prev = qc.getQueryData<{ alerts: AlertDTO[]; newCount: number }>(queryKey);
      if (prev) {
        qc.setQueryData(queryKey, {
          ...prev,
          alerts: prev.alerts.map((a) => (a.id === id ? { ...a, status } : a)),
        });
        const updated = prev.alerts.find((a) => a.id === id);
        if (updated) setSelected({ ...updated, status });
      }
      return { prev, queryKey };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(ctx.queryKey, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  const refreshMutation = useMutation({
    mutationFn: () => apiFetch<{ triggered: number; sources: string[] }>('/api/ai/alerts/refresh', { method: 'POST' }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
      const msg = res.triggered === 0
        ? t('refreshNoAlerts')
        : t('refreshSuccess', { count: res.triggered });
      setToastMsg(msg);
      setTimeout(() => setToastMsg(null), 4500);
    },
    onError: () => {
      setToastMsg(t('error'));
      setTimeout(() => setToastMsg(null), 4000);
    },
  });

  const handleCardClick = (alert: AlertDTO) => {
    setSelected(alert);
    setDetailOpen(true);
  };

  const handleUpdateStatus = (id: string, status: AlertStatus) => {
    updateMutation.mutate({ id, status });
  };

  const alerts = data?.alerts ?? [];
  const newCount = data?.newCount ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle', { count: newCount })}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => refreshMutation.mutate()}
              disabled={refreshMutation.isPending}
            >
              <RefreshCw className={refreshMutation.isPending ? 'animate-spin h-4 w-4' : 'h-4 w-4'} />
              {t('refreshButton')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!canGenerateAi}
              onClick={() => {
                setToastMsg(t('generateAiButtonDisabled'));
                setTimeout(() => setToastMsg(null), 4000);
              }}
              title={!canGenerateAi ? t('creditsRequired') : undefined}
            >
              <Sparkles className="h-4 w-4" />
              {t('generateAiButton')}
            </Button>
          </div>
        }
      />

      {toastMsg && (
        <div className="rounded-lg border border-warning/40 bg-warning/5 p-3 text-sm text-foreground">
          {toastMsg}
        </div>
      )}

      <AlertFilters values={filters} onChange={setFilters} />

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <EmptyState message={t('empty')} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {alerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onClick={() => handleCardClick(alert)}
            />
          ))}
        </div>
      )}

      <AlertDetail
        alert={selected}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setSelected(null);
        }}
        onUpdateStatus={handleUpdateStatus}
        pending={updateMutation.isPending}
      />
    </div>
  );
}
