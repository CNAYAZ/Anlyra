'use client';

export const dynamic = 'force-dynamic';

import { useQuery } from '@tanstack/react-query';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { PageHeader, Card, CardHeader } from '@/components/ui/section';
import { ChartSkeleton, ErrorState } from '@/components/ui/state';
import { useAppLocale } from '@/hooks/use-locale';
import { apiFetch } from '@/lib/api/fetcher';
import { formatCurrency, formatNumber } from '@/lib/utils';

type EfficiencyData = {
  revenuePerEmployeeTrend: { month: string; value: number }[];
  departmentProductivity: { department: string; productivity: number }[];
};

export default function OperationsEfficiencyPage() {
  const locale = useAppLocale();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['operations', 'efficiency'],
    queryFn: () => apiFetch<EfficiencyData>('/api/analysis/operations/efficiency'),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Efficienza" subtitle="Ricavi per dipendente e produttività dipartimenti" />

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <ChartSkeleton />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card>
            <CardHeader title="Ricavi per dipendente (trend)" />
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.revenuePerEmployeeTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v as number, locale)} />
                  <Tooltip formatter={(v: number) => formatCurrency(v, locale)} />
                  <Legend />
                  <Line type="monotone" dataKey="value" name="Ricavi/dipendente" stroke="#6366f1" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <CardHeader title="Produttività per dipartimento" />
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.departmentProductivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                  <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} tickFormatter={(v) => formatNumber(v as number, locale)} />
                  <Tooltip />
                  <Bar dataKey="productivity" name="Produttività" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
