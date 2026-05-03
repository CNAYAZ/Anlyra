'use client';

import * as React from 'react';
import GridLayout, { WidthProvider, type Layout } from 'react-grid-layout';
import { useTranslations } from 'next-intl';
import type { Widget, WidgetType } from '@/lib/widgets/types';
import { WIDGET_META } from '@/lib/widgets/types';
import { WidgetRenderer } from '@/components/widgets/WidgetRenderer';

const ResponsiveGrid = WidthProvider(GridLayout);

interface BuilderCanvasProps {
  widgets: Widget[];
  isPreview: boolean;
  onChange: (widgets: Widget[]) => void;
  onConfigure: (id: string) => void;
  onAdd: (type: WidgetType, position?: { x: number; y: number }) => void;
}

const COLS = 12;
const ROW_HEIGHT = 40;

export function BuilderCanvas({ widgets, isPreview, onChange, onConfigure, onAdd }: BuilderCanvasProps) {
  const layout: Layout[] = widgets.map((w) => ({
    i: w.id,
    x: w.layout.x,
    y: w.layout.y,
    w: w.layout.w,
    h: w.layout.h,
    minW: 2,
    minH: 3,
  }));

  const handleLayoutChange = (next: Layout[]) => {
    const map = new Map(next.map((l) => [l.i, l]));
    onChange(
      widgets.map((w) => {
        const l = map.get(w.id);
        if (!l) return w;
        return { ...w, layout: { x: l.x, y: l.y, w: l.w, h: l.h } };
      }),
    );
  };

  const handleRemove = (id: string) => {
    onChange(widgets.filter((w) => w.id !== id));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/widget-type') as WidgetType;
    if (!type) return;
    onAdd(type);
  };

  if (widgets.length === 0) {
    return (
      <EmptyCanvas onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} />
    );
  }

  return (
    <div
      className="min-h-full"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <ResponsiveGrid
        className="layout"
        layout={layout}
        cols={COLS}
        rowHeight={ROW_HEIGHT}
        margin={[16, 16]}
        containerPadding={[16, 16]}
        isDraggable={!isPreview}
        isResizable={!isPreview}
        draggableHandle=".drag-handle"
        onLayoutChange={handleLayoutChange}
        compactType="vertical"
      >
        {widgets.map((w) => (
          <div key={w.id} data-grid={layout.find((l) => l.i === w.id)}>
            <WidgetRenderer
              widget={w}
              isEditable={!isPreview}
              onConfigure={() => onConfigure(w.id)}
              onRemove={() => handleRemove(w.id)}
            />
          </div>
        ))}
      </ResponsiveGrid>
    </div>
  );
}

function EmptyCanvas(props: React.HTMLAttributes<HTMLDivElement>) {
  const t = useTranslations('builder');
  return (
    <div {...props} className="flex h-[60vh] items-center justify-center p-12 text-center">
      <div className="rounded-card border-2 border-dashed border-slate-300 bg-white px-12 py-16">
        <p className="text-sm text-slate-500">{t('canvasEmpty')}</p>
      </div>
    </div>
  );
}

export function defaultLayoutFor(type: WidgetType, existing: Widget[]): { x: number; y: number; w: number; h: number } {
  const { w, h } = WIDGET_META[type].defaultSize;
  const maxY = existing.reduce((acc, e) => Math.max(acc, e.layout.y + e.layout.h), 0);
  return { x: 0, y: maxY, w, h };
}
