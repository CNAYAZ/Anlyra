'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Lightbulb, Sparkles } from 'lucide-react';
import { InsightCard } from '@/components/ai/insight-card';
import { InsightDetail } from '@/components/ai/insight-detail';
import { InsightFilters, type InsightFilterValues } from '@/components/ai/insight-filters';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCreditsStore } from '@/stores/credits-store';
import type { ApiResponse } from '@/lib/api';
import type { GenerateInsightsResponse, InsightDTO } from '@/types/ai';
import type { InsightPriority, InsightStatus } from '@prisma/client';

const PRIORITY_RANK: Record<InsightPriority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const json = (await res.json()) as ApiResponse<T>;
  if (!json.success || json.data === undefined) {
    throw new Error(json.error ?? 'Request failed');
  }
  return json.data;
}

export function InsightsClient() {
  const t = useTranslations('insights');
  const tCommon = useTranslations('common');
  const qc = useQueryClient();
  const credits = useCreditsStore((s) => s.credits);
  const setCredits = useCreditsStore((s) => s.setCredits);
  const [filters, setFilters] = useState<InsightFilterValues>({ type: 'ALL', priority: 'ALL', status: 'ALL' });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const insightsQuery = useQuery({
    queryKey: ['insights'],
    queryFn: () => fetchJson<{ insights: InsightDTO[] }>('/api/ai/insights').then((d) => d.insights),
  });

  const updateMutation = useMutation({
    mutationFn: async (vars: { id: string; status: InsightStatus }) =>
      fetchJson<{ insight: InsightDTO }>(`/api/ai/insights/${vars.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: vars.status }),
      }),
    onSuccess: (res) => {
      qc.setQueryData<InsightDTO[] | undefined>(['insights'], (old) =>
        old ? old.map((i) => (i.id === res.insight.id ? res.insight : i)) : old
      );
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () =>
      fetchJson<GenerateInsightsResponse>('/api/ai/insights/generate', { method: 'POST' }),
    onSuccess: (res) => {
      setCredits(res.creditsRemaining);
      qc.setQueryData<InsightDTO[] | undefined>(['insights'], (old) =>
        old ? [...res.insights, ...old] : res.insights
      );
    },
  });

  const filtered = useMemo(() => {
    const list = insightsQuery.data ?? [];
    return list
      .filter((i) => filters.type === 'ALL' || i.type === filters.type)
      .filter((i) => filters.priority === 'ALL' || i.priority === filters.priority)
      .filter((i) => filters.status === 'ALL' || i.status === filters.status)
      .sort((a, b) => {
        const p = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        if (p !== 0) return p;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [insightsQuery.data, filters]);

  const activeInsight = activeId ? (insightsQuery.data ?? []).find((i) => i.id === activeId) ?? null : null;
  const noCredits = credits < 3;

  return (
    <div className="container py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">{t('title')}</h1>
          <p className="mt-1 text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending || noCredits}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          {generateMutation.isPending ? t('generating') : t('generate')}
          <span className="ml-1 rounded bg-white/20 px-1.5 py-0.5 text-xs font-num">{t('generateCost')}</span>
        </Button>
      </div>

      <div className="mb-6 rounded-lg border border-border bg-card p-4 shadow-card">
        <InsightFilters values={filters} onChange={setFilters} />
      </div>

      {generateMutation.isError && (
        <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-danger">
          {generateMutation.error instanceof Error && generateMutation.error.message === 'INSUFFICIENT_CREDITS'
            ? t('noResults')
            : tCommon('errorGeneric')}
        </p>
      )}

      {insightsQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : insightsQuery.isError ? (
        <p className="text-sm text-danger">{tCommon('errorGeneric')}</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/40 p-12 text-center">
          <Lightbulb className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            {(insightsQuery.data ?? []).length === 0 ? t('empty') : t('noResults')}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onClick={() => {
                setActiveId(insight.id);
                setOpen(true);
              }}
            />
          ))}
        </div>
      )}

      <InsightDetail
        insight={activeInsight}
        open={open}
        onOpenChange={setOpen}
        onUpdateStatus={(id, status) => updateMutation.mutate({ id, status })}
        pending={updateMutation.isPending}
      />
    </div>
  );
}
