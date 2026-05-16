'use client';

import GridLayout, { WidthProvider, type Layout } from 'react-grid-layout';
import type { Widget } from '@/lib/widgets/types';
import { WidgetRenderer } from '@/components/widgets/WidgetRenderer';

const ResponsiveGrid = WidthProvider(GridLayout);

export default function ReadOnlyGrid({ widgets }: { widgets: Widget[] }) {
  const layout: Layout[] = widgets.map((w) => ({
    i: w.id,
    x: w.layout.x,
    y: w.layout.y,
    w: w.layout.w,
    h: w.layout.h,
    static: true,
  }));

  return (
    <ResponsiveGrid
      className="layout"
      layout={layout}
      cols={12}
      rowHeight={40}
      margin={[16, 16]}
      containerPadding={[16, 16]}
      isDraggable={false}
      isResizable={false}
    >
      {widgets.map((w) => (
        <div key={w.id} data-grid={layout.find((l) => l.i === w.id)}>
          <WidgetRenderer widget={w} />
        </div>
      ))}
    </ResponsiveGrid>
  );
}
