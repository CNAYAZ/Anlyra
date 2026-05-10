'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Circle, Link2, Link2Off, RefreshCw } from 'lucide-react';
import { apiFetch } from '@/lib/api/fetcher';
import { usePlan } from '@/lib/billing/context';
import { planMeets } from '@/lib/plan/feature-gate';
import { INTEGRATIONS } from '@/lib/integrations/registry';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type IntegrationStatus = {
  provider: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  frequency: string;
  lastSyncAt: string | null;
  logs: unknown[];
};

function useIntegrationStatus(provider: string) {
  return useQuery({
    queryKey: ['integration', provider],
    queryFn: () => apiFetch<IntegrationStatus>(`/api/integrations/${provider}`),
  });
}

function ConnectDialog({
  provider,
  onClose,
}: {
  provider: string;
  onClose: () => void;
}) {
  const t = useTranslations('integrations');
  const qc = useQueryClient();
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (key: string) =>
      apiFetch(`/api/integrations/${provider}/connect`, {
        method: 'POST',
        body: JSON.stringify({ apiKey: key }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integration', provider] });
      onClose();
    },
    onError: (e) => setError((e as Error).message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
        <h3 className="mb-4 font-heading text-base font-semibold">
          {t('wizard.title', { provider })}
        </h3>
        {error && (
          <div className="mb-3 rounded border border-danger/40 bg-danger/10 p-2 text-xs text-danger">
            {error}
          </div>
        )}
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>{t('wizard.apiKey')}</Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-…"
            />
            <p className="text-[11px] text-muted-foreground">
              {t('wizard.apiKeyHint', { provider })}
            </p>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            {t('actions.connect') === 'Connetti' ? 'Annulla' : 'Cancel'}
          </button>
          <button
            type="button"
            disabled={!apiKey.trim() || mutation.isPending}
            onClick={() => mutation.mutate(apiKey.trim())}
            className={cn(
              'rounded-lg bg-primary-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90',
              (!apiKey.trim() || mutation.isPending) && 'opacity-60',
            )}
          >
            {mutation.isPending ? '…' : t('wizard.submit')}
          </button>
        </div>
      </div>
    </div>
  );
}

function IntegrationCard({ defn }: { defn: (typeof INTEGRATIONS)[0] }) {
  const t = useTranslations('integrations');
  const { plan } = usePlan();
  const qc = useQueryClient();
  const [connecting, setConnecting] = useState(false);

  const { data, isLoading } = useIntegrationStatus(defn.id);

  const disconnectMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/integrations/${defn.id}/disconnect`, { method: 'POST' }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['integration', defn.id] }),
  });

  const syncMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/integrations/${defn.id}/sync`, { method: 'POST' }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['integration', defn.id] }),
  });

  const hasAccess = planMeets(plan as Parameters<typeof planMeets>[0], defn.requiredPlan);
  const isConnected = data?.status === 'CONNECTED';

  return (
    <>
      {connecting && (
        <ConnectDialog provider={defn.id} onClose={() => setConnecting(false)} />
      )}
      <div
        className={cn(
          'card flex flex-col gap-3',
          !hasAccess && 'opacity-60',
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {isLoading ? (
              <Skeleton className="h-4 w-4 rounded-full" />
            ) : isConnected ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <div>
              <p className="font-medium text-sm leading-tight">{defn.name}</p>
              <p className="text-[11px] text-muted-foreground capitalize">{defn.category}</p>
            </div>
          </div>
          {!hasAccess && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {defn.requiredPlan}
            </span>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {t(`providers.${defn.id === 'google-analytics' ? 'googleAnalytics' : defn.id}.description` as 'providers.stripe.description')}
        </p>

        {isLoading ? (
          <Skeleton className="h-3 w-32" />
        ) : (
          <p className="text-[11px] text-muted-foreground">
            {t('lastSync')}:{' '}
            {data?.lastSyncAt
              ? new Date(data.lastSyncAt).toLocaleString()
              : t('neverSynced')}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {hasAccess ? (
            isConnected ? (
              <>
                <button
                  type="button"
                  onClick={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium hover:bg-muted disabled:opacity-60"
                >
                  <RefreshCw className={cn('h-3 w-3', syncMutation.isPending && 'animate-spin')} />
                  {t('actions.syncNow')}
                </button>
                <button
                  type="button"
                  onClick={() => disconnectMutation.mutate()}
                  disabled={disconnectMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-danger hover:bg-danger/10 disabled:opacity-60"
                >
                  <Link2Off className="h-3 w-3" />
                  {t('actions.disconnect')}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConnecting(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary-accent px-2.5 py-1 text-xs font-medium text-white hover:opacity-90"
              >
                <Link2 className="h-3 w-3" />
                {t('actions.connect')}
              </button>
            )
          ) : (
            <span className="text-[11px] text-muted-foreground">
              {t('lockedOn', { plan: defn.requiredPlan })}
            </span>
          )}
        </div>
      </div>
    </>
  );
}

export default function IntegrationsPage() {
  const t = useTranslations('integrations');

  const categories = ['finance', 'crm', 'analytics', 'ecommerce'] as const;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      {categories.map((cat) => {
        const items = INTEGRATIONS.filter((i) => i.category === cat);
        if (items.length === 0) return null;
        return (
          <section key={cat} className="space-y-3">
            <h2 className="font-heading text-base font-semibold text-muted-foreground uppercase tracking-wide text-xs">
              {t(`categories.${cat}`)}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((defn) => (
                <IntegrationCard key={defn.id} defn={defn} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
