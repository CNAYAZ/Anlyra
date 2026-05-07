'use client';

export const dynamic = 'force-dynamic';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import { PageHeader, Card, CardHeader } from '@/components/ui/section';
import { ChartSkeleton, ErrorState } from '@/components/ui/state';
import { apiFetch } from '@/lib/api/fetcher';
import { cn } from '@/lib/utils';

type Insight = {
  id: string;
  type: 'STRATEGY' | 'WARNING' | 'OPPORTUNITY' | 'ACTION';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'NEW' | 'REVIEWED' | 'IMPLEMENTED' | 'IGNORED';
  title: string;
  summary: string;
  content: string;
  confidence: number;
  createdAt: string;
};

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: 'border-l-red-500 bg-red-500/5',
  MEDIUM: 'border-l-amber-500 bg-amber-500/5',
  LOW: 'border-l-blue-500 bg-blue-500/5',
};

const PRIORITY_BADGE: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  LOW: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
};

const STATUS_BADGE: Record<string, string> = {
  NEW: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  REVIEWED: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  IMPLEMENTED: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  IGNORED: 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-500',
};

const STATUS_LABEL: Record<string, string> = {
  NEW: 'Nuovo',
  REVIEWED: 'Rivisto',
  IMPLEMENTED: 'Implementato',
  IGNORED: 'Ignorato',
};

const TYPE_LABEL: Record<string, string> = {
  STRATEGY: 'Strategia',
  WARNING: 'Avviso',
  OPPORTUNITY: 'Opportunità',
  ACTION: 'Azione',
};

function TypeIcon({ type }: { type: Insight['type'] }) {
  if (type === 'WARNING') return <AlertTriangle className="h-5 w-5" />;
  if (type === 'OPPORTUNITY') return <Star className="h-5 w-5" />;
  if (type === 'ACTION') return <ArrowRight className="h-5 w-5" />;
  return <Lightbulb className="h-5 w-5" />;
}

export default function InsightsPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Insight | null>(null);
  const [filterType, setFilterType] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [toast, setToast] = useState<string | null>(null);

  const credits = 100;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['insights', filterType, filterPriority, filterStatus],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filterType) params.set('type', filterType);
      if (filterPriority) params.set('priority', filterPriority);
      if (filterStatus) params.set('status', filterStatus);
      const q = params.toString() ? `?${params.toString()}` : '';
      return apiFetch<{ insights: Insight[] }>(`/api/ai/insights${q}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Insight['status'] }) =>
      apiFetch<{ insight: Insight }>(`/api/ai/insights/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['insights'] });
      setSelected(null);
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () =>
      apiFetch('/api/ai/insights/generate', { method: 'POST' }),
    onError: (err: Error) => {
      setToast(
        err.message.includes('INSUFFICIENT_CREDITS')
          ? 'Crediti insufficienti. Acquistane altri nelle Impostazioni > Fatturazione.'
          : 'Funzione disponibile con crediti AI attivi.',
      );
      setTimeout(() => setToast(null), 4000);
    },
  });

  const insights = data?.insights ?? [];
  const canGenerate = credits >= 3;

  const counts = useMemo(() => {
    const c: Record<string, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    for (const i of insights) c[i.priority] = (c[i.priority] ?? 0) + 1;
    return c;
  }, [insights]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Insight strategici"
        subtitle="Suggerimenti automatici basati sui tuoi dati"
        actions={
          <button
            type="button"
            disabled={!canGenerate || generateMutation.isPending}
            onClick={() => {
              if (!canGenerate) {
                setToast('Crediti insufficienti. Acquistane altri nelle Impostazioni > Fatturazione.');
                setTimeout(() => setToast(null), 4000);
                return;
              }
              generateMutation.mutate();
            }}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              canGenerate
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-slate-200 text-slate-500 cursor-not-allowed dark:bg-slate-800',
            )}
            title={canGenerate ? 'Genera 3 nuovi insight' : 'Servono 3 crediti AI'}
          >
            <Sparkles className="h-4 w-4" />
            Genera nuovi insight (3 crediti)
          </button>
        }
      />

      {toast && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
          {toast}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader title="Alta priorità" />
          <p className="text-3xl font-semibold">{counts.HIGH ?? 0}</p>
        </Card>
        <Card>
          <CardHeader title="Media priorità" />
          <p className="text-3xl font-semibold">{counts.MEDIUM ?? 0}</p>
        </Card>
        <Card>
          <CardHeader title="Bassa priorità" />
          <p className="text-3xl font-semibold">{counts.LOW ?? 0}</p>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1 text-sm"
          >
            <option value="">Tutti i tipi</option>
            <option value="STRATEGY">Strategia</option>
            <option value="WARNING">Avviso</option>
            <option value="OPPORTUNITY">Opportunità</option>
            <option value="ACTION">Azione</option>
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1 text-sm"
          >
            <option value="">Tutte le priorità</option>
            <option value="HIGH">Alta</option>
            <option value="MEDIUM">Media</option>
            <option value="LOW">Bassa</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1 text-sm"
          >
            <option value="">Tutti gli stati</option>
            <option value="NEW">Nuovo</option>
            <option value="REVIEWED">Rivisto</option>
            <option value="IMPLEMENTED">Implementato</option>
            <option value="IGNORED">Ignorato</option>
          </select>
        </div>
      </Card>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <ChartSkeleton />
      ) : insights.length === 0 ? (
        <Card>
          <p className="text-center text-sm text-muted-foreground">Nessun insight con questi filtri.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {insights.map((i) => (
            <button
              key={i.id}
              onClick={() => setSelected(i)}
              className={cn(
                'group flex flex-col gap-2 rounded-lg border-l-4 border border-border p-4 text-left transition-colors hover:border-primary-500/40',
                PRIORITY_COLORS[i.priority],
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 text-foreground">
                  <TypeIcon type={i.type} />
                  <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                    {TYPE_LABEL[i.type]}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase', PRIORITY_BADGE[i.priority])}>
                    {i.priority}
                  </span>
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase', STATUS_BADGE[i.status])}>
                    {STATUS_LABEL[i.status]}
                  </span>
                </div>
              </div>
              <h3 className="text-base font-semibold">{i.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">{i.summary}</p>
              <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>Confidenza: {Math.round(i.confidence * 100)}%</span>
                <span>{new Date(i.createdAt).toLocaleDateString('it-IT')}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelected(null)}>
          <div
            className="w-full max-w-2xl rounded-xl bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-border p-5">
              <div className="flex items-start gap-3">
                <span className="rounded-lg bg-muted p-2"><TypeIcon type={selected.type} /></span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase', PRIORITY_BADGE[selected.priority])}>
                      {selected.priority}
                    </span>
                    <span className="text-xs uppercase text-muted-foreground">{TYPE_LABEL[selected.type]}</span>
                  </div>
                  <h2 className="mt-1 font-heading text-lg font-semibold">{selected.title}</h2>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-md p-1 hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <p className="text-sm text-muted-foreground">{selected.summary}</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{selected.content}</p>
              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Confidenza dell&apos;analisi</span>
                  <span className="font-medium">{Math.round(selected.confidence * 100)}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary-600"
                    style={{ width: `${Math.round(selected.confidence * 100)}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-border bg-muted/30 p-4">
              <button
                onClick={() => updateMutation.mutate({ id: selected.id, status: 'REVIEWED' })}
                disabled={updateMutation.isPending}
                className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
              >
                Rivisto
              </button>
              <button
                onClick={() => updateMutation.mutate({ id: selected.id, status: 'IMPLEMENTED' })}
                disabled={updateMutation.isPending}
                className="inline-flex items-center gap-1 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4" /> Implementato
              </button>
              <button
                onClick={() => updateMutation.mutate({ id: selected.id, status: 'IGNORED' })}
                disabled={updateMutation.isPending}
                className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
              >
                Ignora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
