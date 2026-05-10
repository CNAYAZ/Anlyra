'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/state';
import { BenchmarkControls, type BenchmarkControlValues } from '@/components/ai/benchmarks/benchmark-controls';
import { BenchmarkCard } from '@/components/ai/benchmarks/benchmark-card';
import { BenchmarkChart } from '@/components/ai/benchmarks/benchmark-chart';
import { BenchmarkSummary } from '@/components/ai/benchmarks/benchmark-summary';
import { apiFetch } from '@/lib/api/fetcher';
import type { MetricKey, BenchmarkStatus } from '@/lib/benchmarks-data';
import type { IndustryKey, SizeKey } from '@/lib/benchmarks-data';

type MetricResult = {
  key: MetricKey;
  companyValue: number | null;
  p25: number;
  p50: number;
  p75: number;
  unit: 'percent' | 'months' | 'ratio' | 'score';
  status: BenchmarkStatus | null;
};

type BenchmarkResponse = {
  industry: IndustryKey;
  size: SizeKey;
  metrics: MetricResult[];
};

export default function BenchmarksPage() {
  const t = useTranslations('benchmarks');
  const [controls, setControls] = useState<BenchmarkControlValues>({
    industry: 'saas-b2b',
    size: 'growth',
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['benchmarks', controls.industry, controls.size],
    queryFn: () =>
      apiFetch<BenchmarkResponse>(
        `/api/ai/benchmarks?industry=${controls.industry}&size=${controls.size}`,
      ),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <BenchmarkControls values={controls} onChange={setControls} />

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <>
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-[340px] rounded-xl" />
        </>
      ) : (
        <>
          <BenchmarkSummary metrics={data.metrics} />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.metrics.map((m) => (
              <BenchmarkCard
                key={m.key}
                metric={m.key}
                companyValue={m.companyValue}
                p25={m.p25}
                p50={m.p50}
                p75={m.p75}
                unit={m.unit}
                status={m.status}
              />
            ))}
          </div>

          <div className="card">
            <p className="mb-4 text-sm font-medium">{t('chartTitle')}</p>
            <BenchmarkChart metrics={data.metrics} />
          </div>
        </>
      )}
    </div>
  );
}
