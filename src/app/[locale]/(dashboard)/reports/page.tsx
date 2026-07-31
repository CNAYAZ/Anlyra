'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, Play, Trash2, Calendar, Clock, Loader2 } from 'lucide-react';
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

  const [runningId, setRunningId] = useState<string | null>(null);
  const [runError, setRunError] = useState('');

  // "Run now" returns a PDF stream, not the JSON envelope apiFetch expects, so it
  // is fetched directly and saved as a file.
  async function runReport(id: string, title: string) {
    if (runningId) return;
    setRunningId(id);
    setRunError('');
    try {
      const res = await fetch(`/api/reports/${id}`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'RUN_FAILED');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      qc.invalidateQueries({ queryKey: ['reports'] });
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      setRunError(
        code === 'NO_DATA_FOR_REPORT'
          ? t('runNoData')
          : code === 'REPORT_NOT_RENDERABLE'
            ? t('notRenderable')
            : t('runFailed'),
      );
    } finally {
      setRunningId(null);
    }
  }

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

      {runError && (
        <div className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          {runError}
        </div>
      )}

      {isLoading || !data ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      ) : data.reports.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-3 py-12 text-center text-sm text-muted-foreground">
          <FileText className="h-8 w-8 opacity-40" />
          <p className="font-medium text-foreground">{t('empty.title')}</p>
          <p>{t('empty.description')}</p>
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

              {/* Riattivato il 2026-07-28: "Genera ora" produce davvero il PDF
                  dai dati reali dell'organizzazione (prima aggiornava solo la
                  data e non generava nulla). */}
              <button
                type="button"
                onClick={() => runReport(r.id, r.title)}
                disabled={runningId === r.id}
                className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-60"
              >
                {runningId === r.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
                {runningId === r.id ? t('running') : t('runNow')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
