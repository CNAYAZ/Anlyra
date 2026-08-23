'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Sparkles } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { InsightCard } from '@/components/ai/insight-card';
import { InsightDetail } from '@/components/ai/insight-detail';
import { InsightFilters, type InsightFilterValues } from '@/components/ai/insight-filters';
import { PageHeader } from '@/components/ui/section';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState, EmptyState } from '@/components/ui/state';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { apiFetch } from '@/lib/api/fetcher';
import { useCreditsStore } from '@/stores/credits-store';
import type { InsightDTO } from '@/types/ai';

type InsightStatus = 'NEW' | 'REVIEWED' | 'IMPLEMENTED' | 'IGNORED';

/** Credits charged by POST /api/ai/insights/generate. Mirrors the server. */
const GENERATION_CREDIT_COST = 3;

export default function InsightsPage() {
  const t = useTranslations('insights');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const aiCreditsBalance = useCreditsStore((s) => s.credits);
  const setCredits = useCreditsStore((s) => s.setCredits);
  const qc = useQueryClient();

  const [filters, setFilters] = useState<InsightFilterValues>({
    type: 'ALL',
    priority: 'ALL',
    status: 'ALL',
  });
  const [selected, setSelected] = useState<InsightDTO | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  // Only INSUFFICIENT_CREDITS gets the Upgrade link next to it — the other
  // codes (rate limit, bad AI response, missing data) aren't fixed by upgrading.
  const [generateErrorIsCredits, setGenerateErrorIsCredits] = useState(false);

  const canGenerate = aiCreditsBalance >= GENERATION_CREDIT_COST;

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

  const generateMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ created: number; creditsRemaining: number }>('/api/ai/insights/generate', {
        method: 'POST',
        body: JSON.stringify({ locale }),
      }),
    onMutate: () => {
      setGenerateError(null);
      setGenerateErrorIsCredits(false);
    },
    onSuccess: (res) => {
      // Keep the header credit counter honest without waiting for a refetch.
      setCredits(res.creditsRemaining);
      qc.invalidateQueries({ queryKey: ['insights'] });
      showToast(t('generateSuccess', { count: res.created }));
    },
    onError: (err: Error) => {
      // The API answers with stable codes (see the route); anything else falls
      // back to a generic message rather than leaking a raw error string.
      const code = err.message;
      const known: Record<string, string> = {
        INSUFFICIENT_CREDITS: t('generateErrorCredits'),
        NOT_ENOUGH_DATA: t('generateErrorNoData'),
        INVALID_AI_RESPONSE: t('generateErrorModel'),
        RATE_LIMITED: t('generateErrorRateLimited'),
        TRIAL_EXPIRED: t('generateErrorTrial'),
      };
      setGenerateError(known[code] ?? t('generateErrorGeneric'));
      setGenerateErrorIsCredits(code === 'INSUFFICIENT_CREDITS');
    },
  });

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
      {/* Riattivato il 2026-08-21: la generazione è reale (POST /api/ai/insights/generate). */}
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <Button
            variant="primary"
            size="sm"
            disabled={!canGenerate || generateMutation.isPending}
            onClick={() => generateMutation.mutate()}
            title={!canGenerate ? t('creditsRequired') : undefined}
          >
            {generateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden />
            )}
            {generateMutation.isPending ? t('generating') : t('generateButton')}
          </Button>
        }
      />

      {toastMsg && (
        <div className="rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-foreground">
          {toastMsg}
        </div>
      )}

      {generateError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-foreground"
        >
          <span>{generateError}</span>
          {generateErrorIsCredits && (
            <Link
              href="/settings/billing"
              className="shrink-0 font-medium text-danger underline-offset-4 hover:underline"
            >
              {tCommon('upgrade')}
            </Link>
          )}
        </div>
      )}

      {!canGenerate && !generateMutation.isPending && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-foreground">
          <span>{t('generateButtonDisabled')}</span>
          <Link
            href="/settings/billing"
            className="shrink-0 font-medium underline-offset-4 hover:underline"
          >
            {tCommon('upgrade')}
          </Link>
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
