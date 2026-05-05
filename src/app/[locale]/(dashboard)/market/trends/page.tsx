'use client';

export const dynamic = 'force-dynamic';

import { useQuery } from '@tanstack/react-query';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { PageHeader, Card, CardHeader } from '@/components/ui/section';
import { ChartSkeleton, ErrorState } from '@/components/ui/state';
import { useAppLocale } from '@/hooks/use-locale';
import { apiFetch } from '@/lib/api/fetcher';
import { formatCurrency } from '@/lib/utils';

type Trend = {
  id: string;
  period: string;
  marketSize: number;
  growthPct: number;
  tam: number;
  sam: number;
  som: number;
};

export default function MarketTrendsPage() {
  const locale = useAppLocale();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['market', 'trends'],
    queryFn: () => apiFetch<{ trends: Trend[] }>('/api/analysis/market/trends'),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Trend di mercato" subtitle="Evoluzione TAM/SAM/SOM negli ultimi 18 mesi" />
      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <ChartSkeleton />
      ) : (
        <Card>
          <CardHeader title="TAM · SAM · SOM" />
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => formatCurrency(v as number, locale)} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v, locale)} />
                <Legend />
                <Line type="monotone" dataKey="tam" name="TAM" stroke="#6366f1" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="sam" name="SAM" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="som" name="SOM" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}
