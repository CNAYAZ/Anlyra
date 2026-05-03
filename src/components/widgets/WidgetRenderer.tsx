'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import type { Widget } from '@/lib/widgets/types';
import { WidgetFrame } from './WidgetFrame';
import { KpiWidget } from './KpiWidget';
import { LineWidget, BarWidget, AreaWidget, PieWidget, RadarWidget } from './ChartWidgets';
import { GaugeWidget } from './GaugeWidget';
import { TableWidget } from './TableWidget';
import { FunnelWidget } from './FunnelWidget';
import { HeatmapWidget } from './HeatmapWidget';
import { NoteWidget } from './NoteWidget';
import { AiInsightWidget } from './AiInsightWidget';
import { ForecastWidget } from './ForecastWidget';
import { BenchmarkWidget } from './BenchmarkWidget';

interface WidgetRendererProps {
  widget: Widget;
  isEditable?: boolean;
  onConfigure?: () => void;
  onRemove?: () => void;
}

export function WidgetRenderer({ widget, isEditable, onConfigure, onRemove }: WidgetRendererProps) {
  const tWidgets = useTranslations('widgets');
  const tMetrics = useTranslations('metrics');
  const tPeriods = useTranslations('periods');

  const widgetName = tWidgets(`${widget.type}.name`);
  const title = widget.config.title?.trim() || widgetName;
  const subtitleParts: string[] = [];
  if (widget.config.metric && widget.type !== 'note' && widget.type !== 'radar') {
    subtitleParts.push(tMetrics(widget.config.metric));
  }
  if (widget.config.period && (widget.type === 'line' || widget.type === 'bar' || widget.type === 'area' || widget.type === 'kpi' || widget.type === 'table' || widget.type === 'ai')) {
    subtitleParts.push(tPeriods(widget.config.period));
  }
  const subtitle = subtitleParts.length > 0 ? subtitleParts.join(' · ') : undefined;

  return (
    <WidgetFrame
      title={title}
      subtitle={subtitle}
      isEditable={isEditable}
      onConfigure={onConfigure}
      onRemove={onRemove}
    >
      <Body widget={widget} />
    </WidgetFrame>
  );
}

function Body({ widget }: { widget: Widget }) {
  switch (widget.type) {
    case 'kpi':
      return <KpiWidget widget={widget} />;
    case 'line':
      return <LineWidget widget={widget} />;
    case 'bar':
      return <BarWidget widget={widget} />;
    case 'area':
      return <AreaWidget widget={widget} />;
    case 'pie':
      return <PieWidget widget={widget} />;
    case 'radar':
      return <RadarWidget widget={widget} />;
    case 'gauge':
      return <GaugeWidget widget={widget} />;
    case 'table':
      return <TableWidget widget={widget} />;
    case 'funnel':
      return <FunnelWidget widget={widget} />;
    case 'heatmap':
      return <HeatmapWidget widget={widget} />;
    case 'note':
      return <NoteWidget widget={widget} />;
    case 'ai':
      return <AiInsightWidget widget={widget} />;
    case 'forecast':
      return <ForecastWidget widget={widget} />;
    case 'benchmark':
      return <BenchmarkWidget widget={widget} />;
    default:
      return null;
  }
}
