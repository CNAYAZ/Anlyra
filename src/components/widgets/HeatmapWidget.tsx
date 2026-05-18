'use client';

import { useLocale } from 'next-intl';
import { getHeatmap } from '@/lib/widgets/data';
import type { Widget } from '@/lib/widgets/types';

function hexWithAlpha(hex: string, alpha: number) {
  const cleaned = hex.replace('#', '');
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0');
  return `#${cleaned}${a}`;
}

export function HeatmapWidget({ widget }: { widget: Widget }) {
  const locale = useLocale();
  const { days, hours, matrix } = getHeatmap(locale);
  const color = widget.config.color ?? '#3b82f6';

  return (
    <div className="flex h-full flex-col">
      <div className="grid flex-1" style={{ gridTemplateColumns: `2.5rem repeat(${hours.length}, minmax(0, 1fr))` }}>
        <div />
        {hours.map((h) => (
          <div key={h} className="text-center text-[10px] text-muted-foreground">
            {h}
          </div>
        ))}
        {days.map((day, di) => (
          <div key={day} className="contents">
            <div className="flex items-center pr-1 text-[10px] text-muted-foreground">{day}</div>
            {hours.map((_, hi) => {
              const v = matrix[di][hi];
              return (
                <div
                  key={hi}
                  className="m-0.5 rounded-sm"
                  style={{ background: hexWithAlpha(color, 0.15 + (v / 100) * 0.85) }}
                  title={`${day} ${hours[hi]}: ${v}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
