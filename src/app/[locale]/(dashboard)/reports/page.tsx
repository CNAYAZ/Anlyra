'use client';

export const dynamic = 'force-dynamic';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, Play, Trash2, Calendar, Clock } from 'lucide-react';
import { useAppLocale } from '@/hooks/use-locale';
import { formatDate } from '@/lib/utils';
import { apiFetch } from '@/lib/api/fetcher';
import { Skeleton } from '@/components/ui/skeleton';

type Report = {
  id: string;
  title: string;
  description: string | null;
  sections: string[];
  schedule: string | null;
  recipients: string | null;
  lastRunAt: string | null;
  createdAt: string;
};

export default function ReportsPage() {
  const t = useTranslations('reports');
  const qc = useQueryClient();
  const locale = useAppLocale();

  const { data, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => apiFetch<{ reports: Report[] }>('/api/reports'),
  });

  const runMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/reports/${id}`, { method: 'POST' }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['reports'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/reports/${id}`, { method: 'DELETE' }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['reports'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Link
          href="/reports/builder"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> {t('newReport')}
        </Link>
      </div>

      {isLoading || !data ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      ) : data.reports.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-3 py-12 text-sm text-muted-foreground">
          <FileText className="h-8 w-8 opacity-40" />
          <p>{t('empty')}</p>
          <Link
            href="/reports/builder"
            className="inline-flex items-center gap-2 rounded-lg bg-primary-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            <Plus className="h-3 w-3" /> {t('newReport')}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {data.reports.map((r) => (
            <div key={r.id} className="card flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-heading text-base font-semibold">{r.title}</h3>
                  {r.description && <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(r.id)}
                  className="rounded p-1 text-muted-foreground hover:bg-danger/10 hover:text-danger"
                  title={t('delete')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {r.sections.slice(0, 4).map((s) => (
                  <span key={s} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {s.replace(/_/g, ' ')}
                  </span>
                ))}
                {r.sections.length > 4 && (
                  <span className="text-[10px] text-muted-foreground">+{r.sections.length - 4}</span>
                )}
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {r.schedule && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {t(`schedule${r.schedule.charAt(0).toUpperCase()}${r.schedule.slice(1)}` as 'scheduleWeekly')}
                  </span>
                )}
                {r.lastRunAt && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {t('lastRun')} {formatDate(r.lastRunAt, locale)}
                  </span>
                )}
              </div>

              {/* Messo a riposo il 2026-06-30 — azione non ancora implementata (vedi .vscode/STATO-REALE-E-VALUTAZIONE.md) */}
              {/*
              <button
                type="button"
                onClick={() => runMutation.mutate(r.id)}
                disabled={runMutation.isPending}
                className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                <Play className="h-3 w-3" /> {t('runNow')}
              </button>
              */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
