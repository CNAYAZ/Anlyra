'use client';

export const dynamic = 'force-dynamic';

import { useQuery } from '@tanstack/react-query';
import { Globe } from 'lucide-react';
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

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['market', 'summary'],
    queryFn: () => apiFetch<MarketSummary>('/api/analysis/market'),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Market" subtitle="TAM · SAM · SOM e quota di mercato" />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {isLoading || !data ? (
          Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : (
          <>
            <KpiCard
              label="Quota di mercato"
              value={formatPercent(data.marketSharePct, locale)}
              icon={Globe}
            />
            <KpiCard label="TAM" value={formatCurrency(data.tam, locale)} />
            <KpiCard label="SAM" value={formatCurrency(data.sam, locale)} />
            <KpiCard label="SOM" value={formatCurrency(data.som, locale)} />
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
            <CardHeader title="Sintesi" />
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Crescita stimata: </span>
                <span className="font-medium">{formatPercent(data?.growthPct ?? 0, locale)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Competitor monitorati: </span>
                <span className="font-medium">{formatNumber(data?.competitorCount ?? 0, locale)}</span>
              </div>
              {data?.overview && (
                <p className="pt-2 text-muted-foreground">{data.overview}</p>
              )}
            </div>
          </Card>
        )}

        <Card>
          <CardHeader title="Suggerimenti" />
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Espandere nei segmenti PMI a maggior crescita.</li>
            <li>• Monitorare il pricing dei competitor leader.</li>
            <li>• Aumentare la brand awareness su canali content.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
