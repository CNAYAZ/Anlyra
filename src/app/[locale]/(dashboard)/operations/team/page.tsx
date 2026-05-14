'use client';

export const dynamic = 'force-dynamic';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { PageHeader, Card, CardHeader } from '@/components/ui/section';
import { ChartSkeleton, ErrorState } from '@/components/ui/state';
import { useAppLocale } from '@/hooks/use-locale';
import { apiFetch } from '@/lib/api/fetcher';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';

type Row = {
  department: string;
  headcount: number;
  avgCost: number;
  productivity: number;
  satisfaction: number;
  turnover: number;
};

type TeamData = { table: Row[] };

export default function OperationsTeamPage() {
  const locale = useAppLocale();
  const t = useTranslations('team');
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['operations', 'team'],
    queryFn: () => apiFetch<TeamData>('/api/analysis/operations/team'),
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <ChartSkeleton />
      ) : (
        <Card>
          <CardHeader title={t('table.deptCount', { count: data.table.length })} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr className="text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-4">{t('table.department')}</th>
                  <th className="py-2 pr-4">{t('table.headcount')}</th>
                  <th className="py-2 pr-4">{t('table.avgCost')}</th>
                  <th className="py-2 pr-4">{t('table.productivity')}</th>
                  <th className="py-2 pr-4">{t('table.satisfaction')}</th>
                  <th className="py-2 pr-4">{t('table.turnover')}</th>
                </tr>
              </thead>
              <tbody>
                {data.table.map((r) => (
                  <tr key={r.department} className="border-b border-border/50">
                    <td className="py-3 pr-4 font-medium capitalize">{r.department}</td>
                    <td className="py-3 pr-4">{formatNumber(r.headcount, locale)}</td>
                    <td className="py-3 pr-4">{formatCurrency(r.avgCost, locale)}</td>
                    <td className="py-3 pr-4">{formatNumber(r.productivity, locale, 0)}/100</td>
                    <td className="py-3 pr-4">{formatNumber(r.satisfaction, locale, 0)}/100</td>
                    <td className="py-3 pr-4">{formatPercent(r.turnover, locale)}</td>
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
