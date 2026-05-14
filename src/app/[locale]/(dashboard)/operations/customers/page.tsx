'use client';

export const dynamic = 'force-dynamic';

import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useTranslations } from 'next-intl';
import { PageHeader, Card, CardHeader } from '@/components/ui/section';
import { ChartSkeleton, ErrorState } from '@/components/ui/state';
import { useAppLocale } from '@/hooks/use-locale';
import { apiFetch } from '@/lib/api/fetcher';
import { formatNumber, formatPercent } from '@/lib/utils';

type CustomersData = {
  churnRetention: { month: string; churn: number; retention: number }[];
  npsTrend: { month: string; nps: number }[];
  newCustomers: { month: string; value: number }[];
  cumulativeGrowth: { month: string; total: number }[];
};

export default function OperationsCustomersPage() {
  const locale = useAppLocale();
  const t = useTranslations('customers');
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['operations', 'customers'],
    queryFn: () => apiFetch<CustomersData>('/api/analysis/operations/customers'),
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <ChartSkeleton />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card>
            <CardHeader title={t('churnRetention')} />
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.churnRetention}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatPercent(v as number, locale, 0)} />
                  <Tooltip formatter={(v: number) => formatPercent(v, locale)} />
                  <Legend />
                  <Line type="monotone" dataKey="churn" name={t('charts.churnSeries')} stroke="#ef4444" strokeWidth={2} />
                  <Line type="monotone" dataKey="retention" name={t('charts.retentionSeries')} stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <CardHeader title={t('npsTrend')} />
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.npsTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="nps" name={t('charts.npsSeries')} stroke="#6366f1" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <CardHeader title={t('newCustomers')} />
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.newCustomers}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatNumber(v as number, locale)} />
                  <Tooltip formatter={(v: number) => formatNumber(v, locale)} />
                  <Bar dataKey="value" name={t('charts.newSeries')} fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <CardHeader title={t('cumulativeGrowth')} />
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.cumulativeGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatNumber(v as number, locale)} />
                  <Tooltip formatter={(v: number) => formatNumber(v, locale)} />
                  <Line type="monotone" dataKey="total" name={t('charts.totalSeries')} stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
