'use client';

import { useLocale } from 'next-intl';
import { Sparkles } from 'lucide-react';
import { getAiInsight } from '@/lib/widgets/data';
import type { Widget } from '@/lib/widgets/types';

export function AiInsightWidget({ widget }: { widget: Widget }) {
  const locale = useLocale();
  const metric = widget.config.metric ?? 'revenue';
  const period = widget.config.period ?? '30d';
  const insight = getAiInsight(metric, period, locale);
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-2 text-xs font-medium text-primary-accent">
        <Sparkles className="h-4 w-4" />
        {insight.generatedBy}
      </div>
      <ul className="flex-1 space-y-2 overflow-auto text-sm leading-relaxed text-slate-700 scrollbar-thin">
        {insight.bullets.map((b, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-accent" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
