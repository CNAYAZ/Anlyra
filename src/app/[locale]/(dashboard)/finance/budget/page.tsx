'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { PlannedVsActualChart } from '@/components/charts/planned-vs-actual-chart';
import { PageHeader, Card, CardHeader } from '@/components/ui/section';
import { ChartSkeleton, ErrorState, LoadingSkeleton } from '@/components/ui/state';
import { useAppLocale } from '@/hooks/use-locale';
import { apiFetch } from '@/lib/api/fetcher';
import { cn, formatCurrency, formatPercent } from '@/lib/utils';

type BudgetRow = {
  id: string;
  category: string;
  planned: number;
  actual: number;
  diff: number;
  usage: number;
};

type BudgetResponse = {
  period: string;
  periods: string[];
  rows: BudgetRow[];
};

function usageColor(usage: number) {
  if (usage > 100) return 'bg-danger';
  if (usage >= 80) return 'bg-warning';
  return 'bg-success';
}

export default function BudgetPage() {
  const locale = useAppLocale();
  const t = useTranslations('budget');
  const [period, setPeriod] = useState<string>('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['budget', period],
    queryFn: () =>
      apiFetch<BudgetResponse>(`/api/analysis/financial/budget${period ? `?period=${period}` : ''}`),
  });

  const periodOptions = data?.periods ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <select
            value={period || data?.period || ''}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium"
          >
            {periodOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        }
      />

      {isLoading ? (
        <ChartSkeleton />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <Card>
          <CardHeader title={t('chart.compare')} />
          <PlannedVsActualChart
            data={data?.rows ?? []}
            locale={locale}
            plannedLabel={t('table.planned')}
            actualLabel={t('table.actual')}
            labelFormatter={(k) => k.replace(/_/g, ' ')}
          />
        </Card>
      )}

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">{t('table.category')}</th>
                <th className="text-right px-4 py-3">{t('table.planned')}</th>
                <th className="text-right px-4 py-3">{t('table.actual')}</th>
                <th className="text-right px-4 py-3">{t('table.diff')}</th>
                <th className="text-left px-4 py-3 w-1/3">{t('table.usage')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-4 py-3" colSpan={5}>
                      <LoadingSkeleton height="h-4" />
                    </td>
                  </tr>
                ))}
              {!isLoading &&
                data?.rows.map((row) => {
                  const diffTone = row.diff <= 0 ? 'text-success' : 'text-danger';
                  return (
                    <tr key={row.id} className="border-t border-border">
                      <td className="px-4 py-3 capitalize font-medium">{row.category.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 text-right num">{formatCurrency(row.planned, locale)}</td>
                      <td className="px-4 py-3 text-right num">{formatCurrency(row.actual, locale)}</td>
                      <td className={cn('px-4 py-3 text-right num font-medium', diffTone)}>
                        {row.diff >= 0 ? '+' : ''}
                        {formatCurrency(row.diff, locale)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn('h-full rounded-full transition-all', usageColor(row.usage))}
                              style={{ width: `${Math.min(100, row.usage)}%` }}
                            />
                          </div>
                          <span className={cn('num text-xs w-14 text-right', row.usage > 100 ? 'text-danger' : 'text-muted-foreground')}>
                            {formatPercent(row.usage, locale)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              {!isLoading && (data?.rows.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-muted-foreground py-8">
                    —
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
