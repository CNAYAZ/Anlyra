'use client';

export const dynamic = 'force-dynamic';

import { useQuery } from '@tanstack/react-query';
import { AlertCircle, AlertTriangle, Info, CheckCircle2, type LucideIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { PageHeader } from '@/components/ui/section';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState, EmptyState } from '@/components/ui/state';
import { apiFetch } from '@/lib/api/fetcher';
import { cn } from '@/lib/utils';
import type { FinancialFact, FactSeverity } from '@/lib/facts/financial-facts';

type FactsResponse = { facts: FinancialFact[] };

const SEVERITY_ORDER: Record<FactSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

const SEVERITY_STYLES: Record<FactSeverity, { icon: LucideIcon; card: string; icon_: string }> = {
  critical: {
    icon: AlertCircle,
    card: 'border-danger/30 bg-danger/5 dark:bg-danger/10',
    icon_: 'text-danger',
  },
  warning: {
    icon: AlertTriangle,
    card: 'border-warning/30 bg-warning/5 dark:bg-warning/10',
    icon_: 'text-warning',
  },
  info: {
    icon: Info,
    card: 'border-border bg-card',
    icon_: 'text-muted-foreground',
  },
};

function FactCard({ fact }: { fact: FinancialFact }) {
  const styles = SEVERITY_STYLES[fact.severity];
  const Icon = styles.icon;

  return (
    <div className={cn('flex items-start gap-3 rounded-lg border p-4', styles.card)}>
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', styles.icon_)} aria-hidden />
      <div>
        <p className="text-sm font-semibold text-foreground">{fact.title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{fact.description}</p>
      </div>
    </div>
  );
}

export default function SituazionePage() {
  const t = useTranslations('situazione');
  const locale = useLocale();

  const { data, isLoading, isError, refetch } = useQuery({
    // The locale is part of the key: switching language must refetch, because
    // the fact sentences are composed server-side in that language.
    queryKey: ['facts', locale],
    queryFn: () =>
      apiFetch<FactsResponse>(`/api/analysis/facts?locale=${encodeURIComponent(locale)}`),
  });

  const facts = [...(data?.facts ?? [])].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : facts.length === 0 ? (
        <EmptyState icon={CheckCircle2} message={t('empty')} tone="sage" />
      ) : (
        <div className="space-y-3">
          {facts.map((fact) => (
            <FactCard key={fact.id} fact={fact} />
          ))}
        </div>
      )}
    </div>
  );
}
