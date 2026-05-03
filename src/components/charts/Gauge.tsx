'use client';

import { motion } from 'framer-motion';
import { STATUS_COLORS, type StatusLevel } from '@/lib/utils';

export interface GaugeProps {
  value: number;
  min?: number;
  max?: number;
  label: string;
  formattedValue: string;
  status: StatusLevel;
  /** thresholds expressed as percentages 0..1 of (max-min) for the warning/good band start */
  warnAt?: number;
  goodAt?: number;
  /** if true, lower values are better (e.g. churn) */
  invert?: boolean;
}

export function Gauge({
  value,
  min = 0,
  max = 100,
  label,
  formattedValue,
  status,
  warnAt = 0.4,
  goodAt = 0.7,
  invert = false,
}: GaugeProps) {
  const range = max - min;
  const ratio = Math.min(1, Math.max(0, (value - min) / range));
  const angle = -180 + ratio * 180;

  const cx = 100;
  const cy = 100;
  const r = 80;

  function arc(startRatio: number, endRatio: number) {
    const start = polar(cx, cy, r, -180 + startRatio * 180);
    const end = polar(cx, cy, r, -180 + endRatio * 180);
    const large = endRatio - startRatio > 0.5 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
  }

  const stops = invert
    ? [
        { from: 0, to: 1 - goodAt, color: STATUS_COLORS['on-target'].hex },
        { from: 1 - goodAt, to: 1 - warnAt, color: STATUS_COLORS.warning.hex },
        { from: 1 - warnAt, to: 1, color: STATUS_COLORS['off-target'].hex },
      ]
    : [
        { from: 0, to: warnAt, color: STATUS_COLORS['off-target'].hex },
        { from: warnAt, to: goodAt, color: STATUS_COLORS.warning.hex },
        { from: goodAt, to: 1, color: STATUS_COLORS['on-target'].hex },
      ];

  const needle = polar(cx, cy, r - 12, angle);
  const statusHex = STATUS_COLORS[status].hex;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 120" className="w-full max-w-[260px]" role="img" aria-label={label}>
        {stops.map((s, i) => (
          <path
            key={i}
            d={arc(s.from, s.to)}
            fill="none"
            stroke={s.color}
            strokeWidth={16}
            strokeLinecap="butt"
            opacity={0.85}
          />
        ))}
        <motion.line
          x1={cx}
          y1={cy}
          x2={needle.x}
          y2={needle.y}
          stroke="#0f172a"
          strokeWidth={3}
          strokeLinecap="round"
          initial={{ x2: polar(cx, cy, r - 12, -180).x, y2: polar(cx, cy, r - 12, -180).y }}
          animate={{ x2: needle.x, y2: needle.y }}
          transition={{ type: 'spring', stiffness: 70, damping: 14 }}
        />
        <circle cx={cx} cy={cy} r={6} fill="#0f172a" />
      </svg>
      <p className="num text-2xl font-semibold mt-1" style={{ color: statusHex }}>
        {formattedValue}
      </p>
      <p className="text-xs text-slate-500 text-center mt-0.5">{label}</p>
    </div>
  );
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
