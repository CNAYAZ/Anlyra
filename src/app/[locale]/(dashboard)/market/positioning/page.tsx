'use client';

export const dynamic = 'force-dynamic';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ZAxis,
} from 'recharts';
import { PageHeader, Card, CardHeader } from '@/components/ui/section';
import { ChartSkeleton, ErrorState } from '@/components/ui/state';
import { apiFetch } from '@/lib/api/fetcher';

type Profile = { qualityScore: number; pricePosition: number };
type Competitor = { id: string; name: string; qualityScore: number; pricePosition: number; marketSharePct: number };
type SwotItem = { id: string; kind: 'STRENGTH' | 'WEAKNESS' | 'OPPORTUNITY' | 'THREAT'; text: string; weight: number };
type SwotKind = SwotItem['kind'];

type Resp = { profile: Profile; competitors: Competitor[]; swot: SwotItem[] };

const SWOT_KINDS: SwotKind[] = ['STRENGTH', 'WEAKNESS', 'OPPORTUNITY', 'THREAT'];

const SWOT_CLS: Record<SwotKind, string> = {
  STRENGTH: 'bg-green-500/10 border-green-500/40',
  WEAKNESS: 'bg-red-500/10 border-red-500/40',
  OPPORTUNITY: 'bg-blue-500/10 border-blue-500/40',
  THREAT: 'bg-amber-500/10 border-amber-500/40',
};

const SWOT_KEY: Record<SwotKind, 'strength' | 'weakness' | 'opportunity' | 'threat'> = {
  STRENGTH: 'strength',
  WEAKNESS: 'weakness',
  OPPORTUNITY: 'opportunity',
  THREAT: 'threat',
};

export default function MarketPositioningPage() {
  const t = useTranslations('positioning');
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['market', 'positioning'],
    queryFn: () => apiFetch<Resp>('/api/analysis/market/positioning'),
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <ChartSkeleton />
      ) : (
        <>
          <Card>
            <CardHeader title={t('mapTitle')} />
            <div className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                  <XAxis type="number" dataKey="pricePosition" name={t('priceAxis')} domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <YAxis type="number" dataKey="qualityScore" name={t('qualityAxis')} domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <ZAxis type="number" dataKey="marketSharePct" range={[80, 400]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Legend />
                  <Scatter
                    name={t('companyName')}
                    data={[{ ...data.profile, marketSharePct: 10, name: t('companyName') }]}
                    fill="#6366f1"
                  />
                  <Scatter name={t('competitorLabel')} data={data.competitors} fill="#f59e0b" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {SWOT_KINDS.map((kind) => (
              <Card key={kind} className={SWOT_CLS[kind] + ' border'}>
                <CardHeader title={t(SWOT_KEY[kind])} />
                <ul className="space-y-1.5 text-sm">
                  {data.swot
                    .filter((s) => s.kind === kind)
                    .map((s) => (
                      <li key={s.id}>• {s.text}</li>
                    ))}
                </ul>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
