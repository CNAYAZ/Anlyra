'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import {
  BarChart3,
  LineChart,
  PieChart,
  Activity,
  Gauge,
  Table2,
  Filter,
  Grid3x3,
  StickyNote,
  Sparkles,
  TrendingUp,
  Target,
  Hash,
  AreaChart,
} from 'lucide-react';
import type { WidgetType } from '@/lib/widgets/types';
import { WIDGET_TYPES } from '@/lib/widgets/types';

const ICON: Record<WidgetType, React.ComponentType<{ className?: string }>> = {
  kpi: Hash,
  line: LineChart,
  bar: BarChart3,
  area: AreaChart,
  pie: PieChart,
  radar: Activity,
  gauge: Gauge,
  table: Table2,
  funnel: Filter,
  heatmap: Grid3x3,
  note: StickyNote,
  ai: Sparkles,
  forecast: TrendingUp,
  benchmark: Target,
};

interface WidgetLibraryProps {
  onAdd: (type: WidgetType) => void;
}

export function WidgetLibrary({ onAdd }: WidgetLibraryProps) {
  const tBuilder = useTranslations('builder');
  const tWidgets = useTranslations('widgets');

  const handleDragStart = (e: React.DragEvent<HTMLButtonElement>, type: WidgetType) => {
    e.dataTransfer.setData('application/widget-type', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-heading text-sm font-semibold text-foreground">{tBuilder('library')}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{tBuilder('librarySubtitle')}</p>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 scrollbar-thin">
        <div className="grid grid-cols-1 gap-2">
          {WIDGET_TYPES.map((type) => {
            const Icon = ICON[type];
            return (
              <button
                key={type}
                type="button"
                draggable
                onDragStart={(e) => handleDragStart(e, type)}
                onClick={() => onAdd(type)}
                className="group flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-left transition-all hover:border-primary-accent/40 hover:shadow-card active:cursor-grabbing"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-accent/10 text-primary-accent group-hover:bg-primary-accent group-hover:text-white">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-bg-dark">{tWidgets(`${type}.name`)}</p>
                  <p className="truncate text-xs text-muted-foreground">{tWidgets(`${type}.description`)}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
