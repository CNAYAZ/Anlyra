'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, AlertOctagon, Info, Bell, Play, Trash2 } from 'lucide-react';
import { PageHeader, Card, CardHeader } from '@/components/ui/section';
import { ChartSkeleton, ErrorState } from '@/components/ui/state';
import { apiFetch } from '@/lib/api/fetcher';
import { cn } from '@/lib/utils';

type Alert = {
  id: string;
  type: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  metric: string;
  title: string;
  message: string;
  thresholdValue: number | null;
  currentValue: number | null;
  read: boolean;
  createdAt: string;
};

type AlertConfig = {
  id: string;
  metric: string;
  enabled: boolean;
  threshold: number;
  comparator: 'gt' | 'lt' | 'eq';
};

const SEVERITY_TONE: Record<string, string> = {
  HIGH: 'border-l-red-500 bg-red-500/5',
  MEDIUM: 'border-l-amber-500 bg-amber-500/5',
  LOW: 'border-l-blue-500 bg-blue-500/5',
};
const SEVERITY_BADGE: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  LOW: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
};

const METRIC_LABEL: Record<string, string> = {
  churn_rate: 'Churn rate (%)',
  cash_runway_months: 'Cash runway (mesi)',
  revenue_mom_pct: 'Variazione ricavi MoM (%)',
  cost_mom_pct: 'Variazione costi MoM (%)',
  nps: 'NPS',
};

function SeverityIcon({ s }: { s: string }) {
  if (s === 'HIGH') return <AlertOctagon className="h-5 w-5" />;
  if (s === 'MEDIUM') return <AlertTriangle className="h-5 w-5" />;
  return <Info className="h-5 w-5" />;
}

export default function AlertsPage() {
  const qc = useQueryClient();
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterRead, setFilterRead] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [draftConfigs, setDraftConfigs] = useState<AlertConfig[]>([]);

  const alertsQuery = useQuery({
    queryKey: ['alerts', filterSeverity, filterRead],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filterSeverity) params.set('severity', filterSeverity);
      if (filterRead) params.set('read', filterRead);
      const q = params.toString() ? `?${params.toString()}` : '';
      return apiFetch<{ alerts: Alert[]; unreadCount: number }>(`/api/ai/alerts${q}`);
    },
  });

  const configQuery = useQuery({
    queryKey: ['alerts', 'config'],
    queryFn: () => apiFetch<{ configs: AlertConfig[] }>('/api/ai/alerts/config'),
  });

  useEffect(() => {
    if (configQuery.data?.configs) setDraftConfigs(configQuery.data.configs);
  }, [configQuery.data]);

  const patchMutation = useMutation({
    mutationFn: async ({ id, read }: { id: string; read: boolean }) =>
      apiFetch(`/api/ai/alerts/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ read }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) =>
      apiFetch(`/api/ai/alerts/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const checkMutation = useMutation({
    mutationFn: async () => apiFetch<{ created: { metric: string }[] }>('/api/ai/alerts/check', { method: 'POST' }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
      const n = res.created.length;
      setToast(n === 0 ? 'Nessun nuovo alert: tutto sotto le soglie.' : `Creati ${n} nuovi alert.`);
      setTimeout(() => setToast(null), 4500);
    },
  });

  const saveConfigMutation = useMutation({
    mutationFn: async () =>
      apiFetch('/api/ai/alerts/config', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          configs: draftConfigs.map((c) => ({
            metric: c.metric,
            enabled: c.enabled,
            threshold: c.threshold,
            comparator: c.comparator,
          })),
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts', 'config'] });
      setToast('Configurazione salvata.');
      setTimeout(() => setToast(null), 3000);
    },
  });

  const updateDraft = (metric: string, patch: Partial<AlertConfig>) => {
    setDraftConfigs((prev) =>
      prev.map((c) => (c.metric === metric ? { ...c, ...patch } : c)),
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alert intelligenti"
        subtitle={`${alertsQuery.data?.unreadCount ?? 0} non letti · controllo automatico delle soglie KPI`}
        actions={
          <button
            type="button"
            onClick={() => checkMutation.mutate()}
            disabled={checkMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
          >
            <Play className="h-4 w-4" /> Controlla alert ora
          </button>
        }
      />

      {toast && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
          {toast}
        </div>
      )}

      <Card>
        <div className="flex flex-wrap gap-2">
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1 text-sm"
          >
            <option value="">Tutte le severità</option>
            <option value="HIGH">Alta</option>
            <option value="MEDIUM">Media</option>
            <option value="LOW">Bassa</option>
          </select>
          <select
            value={filterRead}
            onChange={(e) => setFilterRead(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1 text-sm"
          >
            <option value="">Tutti</option>
            <option value="false">Non letti</option>
            <option value="true">Letti</option>
          </select>
        </div>
      </Card>

      {alertsQuery.isError ? (
        <ErrorState onRetry={() => alertsQuery.refetch()} />
      ) : alertsQuery.isLoading ? (
        <ChartSkeleton />
      ) : (alertsQuery.data?.alerts.length ?? 0) === 0 ? (
        <Card>
          <div className="flex flex-col items-center py-8 text-center text-sm text-muted-foreground">
            <Bell className="mb-2 h-8 w-8 opacity-40" />
            Nessun alert con questi filtri.
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {alertsQuery.data!.alerts.map((a) => (
            <div
              key={a.id}
              className={cn(
                'flex items-start gap-4 rounded-lg border-l-4 border border-border p-4',
                SEVERITY_TONE[a.severity],
                a.read && 'opacity-60',
              )}
            >
              <span className="mt-0.5 text-foreground">
                <SeverityIcon s={a.severity} />
              </span>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase', SEVERITY_BADGE[a.severity])}>
                    {a.severity}
                  </span>
                  <span className="text-xs text-muted-foreground">{METRIC_LABEL[a.metric] ?? a.metric}</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString('it-IT')}</span>
                </div>
                <h3 className="mt-1 text-base font-semibold">{a.title}</h3>
                <p className="text-sm text-muted-foreground">{a.message}</p>
                {a.thresholdValue !== null && a.currentValue !== null && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Valore: <span className="font-medium text-foreground">{a.currentValue.toFixed(2)}</span> · Soglia: {a.thresholdValue.toFixed(2)}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {!a.read && (
                  <button
                    onClick={() => patchMutation.mutate({ id: a.id, read: true })}
                    className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                  >
                    Letto
                  </button>
                )}
                <button
                  onClick={() => deleteMutation.mutate(a.id)}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                >
                  <Trash2 className="h-3 w-3" /> Ignora
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardHeader title="Configura soglie" description="Avvisami quando una metrica supera o scende sotto la soglia" />
        {configQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Caricamento…</p>
        ) : (
          <div className="space-y-3">
            {draftConfigs.map((c) => (
              <div key={c.metric} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
                <input
                  type="checkbox"
                  checked={c.enabled}
                  onChange={(e) => updateDraft(c.metric, { enabled: e.target.checked })}
                  className="h-4 w-4"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">{METRIC_LABEL[c.metric] ?? c.metric}</div>
                </div>
                <select
                  value={c.comparator}
                  onChange={(e) => updateDraft(c.metric, { comparator: e.target.value as AlertConfig['comparator'] })}
                  className="rounded-md border border-border bg-background px-2 py-1 text-sm"
                >
                  <option value="gt">&gt;</option>
                  <option value="lt">&lt;</option>
                  <option value="eq">=</option>
                </select>
                <input
                  type="number"
                  value={c.threshold}
                  step="0.1"
                  onChange={(e) => updateDraft(c.metric, { threshold: Number(e.target.value) })}
                  className="w-24 rounded-md border border-border bg-background px-2 py-1 text-sm"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => saveConfigMutation.mutate()}
              disabled={saveConfigMutation.isPending}
              className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
            >
              Salva configurazione
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
