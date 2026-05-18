'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { InsightCard } from '@/components/ai/insight-card';
import { InsightDetail } from '@/components/ai/insight-detail';
import { InsightFilters, type InsightFilterValues } from '@/components/ai/insight-filters';
import { PageHeader } from '@/components/ui/section';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState, EmptyState } from '@/components/ui/state';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api/fetcher';
import { usePlan } from '@/lib/billing/context';
import type { InsightDTO } from '@/types/ai';

type InsightStatus = 'NEW' | 'REVIEWED' | 'IMPLEMENTED' | 'IGNORED';

export default function InsightsPage() {
  const t = useTranslations('insights');
  const { aiCreditsBalance } = usePlan();
  const qc = useQueryClient();

  const [filters, setFilters] = useState<InsightFilterValues>({
    type: 'ALL',
    priority: 'ALL',
    status: 'ALL',
  });
  const [selected, setSelected] = useState<InsightDTO | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const canGenerate = aiCreditsBalance >= 3;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['insights', filters.type, filters.priority, filters.status],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.type !== 'ALL') params.set('type', filters.type);
      if (filters.priority !== 'ALL') params.set('priority', filters.priority);
      if (filters.status !== 'ALL') params.set('status', filters.status);
      const q = params.toString() ? `?${params.toString()}` : '';
      return apiFetch<{ insights: InsightDTO[] }>(`/api/ai/insights${q}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: InsightStatus }) =>
      apiFetch<{ insight: InsightDTO }>(`/api/ai/insights/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ['insights'] });
      const queryKey = ['insights', filters.type, filters.priority, filters.status];
      const prev = qc.getQueryData<{ insights: InsightDTO[] }>(queryKey);
      if (prev) {
        qc.setQueryData(queryKey, {
          insights: prev.insights.map((i) => (i.id === id ? { ...i, status } : i)),
        });
        const updatedInsight = prev.insights.find((i) => i.id === id);
        if (updatedInsight) setSelected({ ...updatedInsight, status });
      }
      return { prev, queryKey };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(ctx.queryKey, ctx.prev);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['insights'] });
    },
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleCardClick = (insight: InsightDTO) => {
    setSelected(insight);
    setDetailOpen(true);
  };

  const handleUpdateStatus = (id: string, status: InsightStatus) => {
    updateMutation.mutate({ id, status });
  };

  const insights = data?.insights ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <Button
            variant="primary"
            size="sm"
            disabled={!canGenerate}
            onClick={() => showToast(t('generateButtonDisabled'))}
            title={!canGenerate ? t('creditsRequired') : undefined}
          >
            <Sparkles className="h-4 w-4" />
            {t('generateButton')}
          </Button>
        }
      />

      {toastMsg && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-foreground">
          {toastMsg}
        </div>
      )}

      <InsightFilters values={filters} onChange={setFilters} />

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : insights.length === 0 ? (
        <EmptyState message={t('empty')} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {insights.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onClick={() => handleCardClick(insight)}
            />
          ))}
        </div>
      )}

      <InsightDetail
        insight={selected}
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
