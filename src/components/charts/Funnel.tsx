'use client';

import { useLocale } from 'next-intl';
import { formatNumber } from '@/lib/utils';

export interface FunnelStage {
  label: string;
  value: number;
}

export function Funnel({ stages }: { stages: FunnelStage[] }) {
  const locale = useLocale();
  if (stages.length === 0) return null;

  const max = stages[0].value;
  const palette = ['#1e3a5f', '#2563eb', '#3b82f6', '#0d9488', '#2dd4bf'];

  return (
    <div className="flex flex-col gap-2">
      {stages.map((s, i) => {
        const ratio = s.value / max;
        const conversion = i === 0 ? 1 : s.value / stages[i - 1].value;
        return (
          <div key={s.label} className="flex items-center gap-3">
            <div className="w-28 text-xs text-muted-foreground truncate" title={s.label}>
              {s.label}
            </div>
            <div className="flex-1 relative">
              <div
                className="h-9 rounded-md text-white text-sm font-medium flex items-center justify-end pr-3 num shadow-sm"
                style={{
                  width: `${Math.max(ratio * 100, 6)}%`,
                  background: palette[i % palette.length],
                }}
              >
                {formatNumber(s.value, locale)}
              </div>
            </div>
            <div className="w-16 text-right num text-xs text-muted-foreground">
              {(conversion * 100).toFixed(1)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
