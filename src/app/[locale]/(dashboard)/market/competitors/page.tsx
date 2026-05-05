'use client';

export const dynamic = 'force-dynamic';

import { useQuery } from '@tanstack/react-query';
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
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['market', 'competitors'],
    queryFn: () => apiFetch<Response>('/api/analysis/market/competitors'),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Competitor" subtitle="Quota di mercato e posizionamento" />
      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <ChartSkeleton />
      ) : data.competitors.length === 0 ? (
        <Card>
          <CardHeader title="Nessun competitor" />
          <p className="text-sm text-muted-foreground">Aggiungi competitor per iniziare l'analisi.</p>
        </Card>
      ) : (
        <Card>
          <CardHeader title={`${data.competitors.length} competitor monitorati`} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr className="text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-4">Nome</th>
                  <th className="py-2 pr-4">Quota mercato</th>
                  <th className="py-2 pr-4">Ricavi stimati</th>
                  <th className="py-2 pr-4">Dipendenti</th>
                  <th className="py-2 pr-4">Qualità</th>
                  <th className="py-2 pr-4">Pricing</th>
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
