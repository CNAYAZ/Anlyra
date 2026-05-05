'use client';

export const dynamic = 'force-dynamic';

import { useQuery } from '@tanstack/react-query';
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

type Resp = { profile: Profile; competitors: Competitor[]; swot: SwotItem[] };

const QUADRANTS = [
  { kind: 'STRENGTH', label: 'Punti di forza', cls: 'bg-green-500/10 border-green-500/40' },
  { kind: 'WEAKNESS', label: 'Punti di debolezza', cls: 'bg-red-500/10 border-red-500/40' },
  { kind: 'OPPORTUNITY', label: 'Opportunità', cls: 'bg-blue-500/10 border-blue-500/40' },
  { kind: 'THREAT', label: 'Minacce', cls: 'bg-amber-500/10 border-amber-500/40' },
] as const;

export default function MarketPositioningPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['market', 'positioning'],
    queryFn: () => apiFetch<Resp>('/api/analysis/market/positioning'),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Posizionamento" subtitle="Mappa qualità/prezzo e analisi SWOT" />

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <ChartSkeleton />
      ) : (
        <>
          <Card>
            <CardHeader title="Mappa qualità vs pricing" />
            <div className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                  <XAxis type="number" dataKey="pricePosition" name="Prezzo" domain={[0, 100]} tick={{ fontSize: 12 }}>
                  </XAxis>
                  <YAxis type="number" dataKey="qualityScore" name="Qualità" domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <ZAxis type="number" dataKey="marketSharePct" range={[80, 400]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Legend />
                  <Scatter
                    name="TechFlow SRL"
                    data={[{ ...data.profile, marketSharePct: 10, name: 'TechFlow SRL' }]}
                    fill="#6366f1"
                  />
                  <Scatter name="Competitor" data={data.competitors} fill="#f59e0b" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {QUADRANTS.map((q) => (
              <Card key={q.kind} className={q.cls + ' border'}>
                <CardHeader title={q.label} />
                <ul className="space-y-1.5 text-sm">
                  {data.swot
                    .filter((s) => s.kind === q.kind)
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
