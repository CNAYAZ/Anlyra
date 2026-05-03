'use client';

import { useLocale } from 'next-intl';
import { formatNumber } from '@/lib/utils';

export interface HeatmapRow {
  label: string;
  values: number[];
}

export function Heatmap({
  rows,
  columns,
  min = 0,
  max = 100,
}: {
  rows: HeatmapRow[];
  columns: string[];
  min?: number;
  max?: number;
}) {
  const locale = useLocale();
  const range = max - min || 1;

  function color(value: number) {
    const t = Math.min(1, Math.max(0, (value - min) / range));
    // red (#dc2626) -> amber (#f59e0b) -> green (#16a34a)
    if (t < 0.5) {
      return mix('#dc2626', '#f59e0b', t / 0.5);
    }
    return mix('#f59e0b', '#16a34a', (t - 0.5) / 0.5);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1">
        <thead>
          <tr>
            <th className="text-left text-xs font-medium text-slate-500 px-2 w-32" />
            {columns.map((c) => (
              <th key={c} className="text-xs font-medium text-slate-500 px-1 py-1">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="text-xs font-medium text-slate-700 px-2 whitespace-nowrap">{row.label}</td>
              {row.values.map((v, idx) => (
                <td
                  key={idx}
                  className="rounded-md text-center text-xs font-medium num text-white"
                  style={{ background: color(v), minWidth: 36, height: 32 }}
                  title={`${row.label} — ${columns[idx]}: ${formatNumber(v, locale)}`}
                >
                  {Math.round(v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function mix(a: string, b: string, t: number) {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}
