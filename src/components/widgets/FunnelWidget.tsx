'use client';

import { useLocale } from 'next-intl';
import { formatNumber } from '@/lib/utils';
import { getFunnelSteps } from '@/lib/widgets/data';
import type { Widget } from '@/lib/widgets/types';

export function FunnelWidget({ widget }: { widget: Widget }) {
  const locale = useLocale();
  const steps = getFunnelSteps(locale);
  const max = steps[0]?.value ?? 1;
  const color = widget.config.color ?? '#3b82f6';

  return (
    <div className="flex h-full flex-col justify-center gap-2">
      {steps.map((step, i) => {
        const width = (step.value / max) * 100;
        const conv = i === 0 ? 100 : (step.value / steps[i - 1].value) * 100;
        return (
          <div key={step.label} className="flex items-center gap-3">
            <div className="w-20 shrink-0 text-xs font-medium text-slate-600">{step.label}</div>
            <div className="relative flex-1">
              <div
                className="flex h-6 items-center rounded px-2 text-xs font-mono font-medium text-white"
                style={{ width: `${width}%`, background: color, opacity: 1 - i * 0.12 }}
              >
                {formatNumber(step.value, locale)}
              </div>
            </div>
            <div className="w-12 shrink-0 text-right text-xs font-mono text-slate-500">
              {formatNumber(conv, locale, { maximumFractionDigits: 0 })}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
