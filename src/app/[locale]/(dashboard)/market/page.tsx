'use client';

export const dynamic = 'force-dynamic';

import { useQuery } from '@tanstack/react-query';
import { Globe } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader, Card, CardHeader } from '@/components/ui/section';
import { ChartSkeleton, ErrorState, KpiSkeleton } from '@/components/ui/state';
import { useAppLocale } from '@/hooks/use-locale';
import { apiFetch } from '@/lib/api/fetcher';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';

type MarketSummary = {
  marketSharePct: number;
  tam: number;
  sam: number;
  som: number;
  growthPct: number;
  overview: string | null;
  competitorCount: number;
  updatedAt: string;
};

export default function MarketOverviewPage() {
  const locale = useAppLocale();
  const t = useTranslations('market');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['market', 'summary'],
    queryFn: () => apiFetch<MarketSummary>('/api/analysis/market'),
  });

  const suggestions = t.raw('overview.suggestions') as string[];

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('tamSubtitle')} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {isLoading || !data ? (
          Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : (
          <>
            <KpiCard
              label={t('kpi.marketShare')}
              value={formatPercent(data.marketSharePct, locale)}
              icon={Globe}
            />
            <KpiCard label={t('kpi.tam')} value={formatCurrency(data.tam, locale)} />
            <KpiCard label={t('kpi.sam')} value={formatCurrency(data.sam, locale)} />
            <KpiCard label={t('kpi.som')} value={formatCurrency(data.som, locale)} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isLoading ? (
          <ChartSkeleton />
        ) : (
          <Card>
            <CardHeader title={t('overview.cardTitle')} />
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">{t('overview.growthLabel')}</span>
                <span className="font-medium">{formatPercent(data?.growthPct ?? 0, locale)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t('overview.competitorsLabel')}</span>
                <span className="font-medium">{formatNumber(data?.competitorCount ?? 0, locale)}</span>
              </div>
              {data?.overview && (
                <p className="pt-2 text-muted-foreground">{data.overview}</p>
              )}
            </div>
          </Card>
        )}

        <Card>
          <CardHeader title={t('overview.suggestionsTitle')} />
          <ul className="space-y-2 text-sm text-muted-foreground">
            {suggestions.map((tip, i) => (
              <li key={i}>• {tip}</li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
