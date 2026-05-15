'use client';

export const dynamic = 'force-dynamic';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { PageHeader, Card, CardHeader } from '@/components/ui/section';
import { ChartSkeleton, ErrorState } from '@/components/ui/state';
import { useAppLocale } from '@/hooks/use-locale';
import { apiFetch } from '@/lib/api/fetcher';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';

type Competitor = {
  id: string;
  name: string;
  revenue: number;
  employees: number;
  marketSharePct: number;
  qualityScore: number;
  pricePosition: number;
  strengths: string[];
};

type Profile = {
  marketSharePct: number;
};

type Response = { profile: Profile; competitors: Competitor[] };

export default function MarketCompetitorsPage() {
  const locale = useAppLocale();
  const t = useTranslations('market');
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['market', 'competitors'],
    queryFn: () => apiFetch<Response>('/api/analysis/market/competitors'),
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t('competitors.title')} subtitle={t('competitors.subtitle')} />
      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <ChartSkeleton />
      ) : data.competitors.length === 0 ? (
        <Card>
          <CardHeader title={t('competitors.emptyTitle')} />
          <p className="text-sm text-muted-foreground">{t('competitors.emptyDesc')}</p>
        </Card>
      ) : (
        <Card>
          <CardHeader title={t('competitors.monitoredCount', { count: data.competitors.length })} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr className="text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-4">{t('competitors.name')}</th>
                  <th className="py-2 pr-4">{t('competitors.marketShare')}</th>
                  <th className="py-2 pr-4">{t('competitors.estimatedRevenue')}</th>
                  <th className="py-2 pr-4">{t('competitors.employees')}</th>
                  <th className="py-2 pr-4">{t('competitors.quality')}</th>
                  <th className="py-2 pr-4">{t('competitors.pricing')}</th>
                </tr>
              </thead>
              <tbody>
                {data.competitors.map((c) => (
                  <tr key={c.id} className="border-b border-border/50">
                    <td className="py-3 pr-4 font-medium">{c.name}</td>
                    <td className="py-3 pr-4">{formatPercent(c.marketSharePct, locale)}</td>
                    <td className="py-3 pr-4">{formatCurrency(c.revenue, locale)}</td>
                    <td className="py-3 pr-4">{formatNumber(c.employees, locale)}</td>
                    <td className="py-3 pr-4">{formatNumber(c.qualityScore, locale)}/100</td>
                    <td className="py-3 pr-4">{formatNumber(c.pricePosition, locale)}/100</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
