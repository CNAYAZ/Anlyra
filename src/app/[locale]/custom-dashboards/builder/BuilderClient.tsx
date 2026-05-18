'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Eye, Save, Pencil, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardsStore } from '@/lib/store/dashboards';
import { WIDGET_META, type Widget, type WidgetConfig, type WidgetType } from '@/lib/widgets/types';
import { generateId } from '@/lib/utils';
import { WidgetLibrary } from '@/components/builder/WidgetLibrary';
import { WidgetConfigDialog } from '@/components/builder/WidgetConfigDialog';

const BuilderCanvas = dynamic(() => import('@/components/builder/BuilderCanvas'), {
  ssr: false,
  loading: () => (
    <div className="grid h-[60vh] grid-cols-3 gap-4 p-6">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-40" />
      ))}
    </div>
  ),
});

export function BuilderClient() {
  const t = useTranslations();
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get('id');

  const hasHydrated = useDashboardsStore((s) => s.hasHydrated);
  const dashboards = useDashboardsStore((s) => s.dashboards);
  const updateDashboard = useDashboardsStore((s) => s.updateDashboard);
  const createDashboard = useDashboardsStore((s) => s.createDashboard);

  const dashboard = id ? dashboards.find((d) => d.id === id) : undefined;

  const [name, setName] = React.useState('');
  const [widgets, setWidgets] = React.useState<Widget[]>([]);
  const [editingName, setEditingName] = React.useState(false);
  const [isPreview, setIsPreview] = React.useState(false);
  const [configureId, setConfigureId] = React.useState<string | null>(null);
  const [savedFlash, setSavedFlash] = React.useState(false);
  const [bootstrapped, setBootstrapped] = React.useState(false);

  React.useEffect(() => {
    if (!hasHydrated) return;
    if (id) {
      const existing = dashboards.find((d) => d.id === id);
      if (existing) {
        setName(existing.name);
        setWidgets(existing.widgets);
        setBootstrapped(true);
      } else {
        router.replace('/custom-dashboards');
      }
    } else {
      const created = createDashboard(t('common.untitled'));
      router.replace(`/custom-dashboards/builder?id=${created.id}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, id]);

  const addWidget = React.useCallback((type: WidgetType) => {
    setWidgets((current) => {
      const meta = WIDGET_META[type];
      const maxY = current.reduce((acc, e) => Math.max(acc, e.layout.y + e.layout.h), 0);
      const widget: Widget = {
        id: generateId('w'),
        type,
        config: { ...meta.defaults },
        layout: { x: 0, y: maxY, w: meta.defaultSize.w, h: meta.defaultSize.h },
      };
      return [...current, widget];
    });
  }, []);

  const updateConfig = (widgetId: string, config: WidgetConfig) => {
    setWidgets((current) => current.map((w) => (w.id === widgetId ? { ...w, config } : w)));
    setConfigureId(null);
  };

  const handleSave = () => {
    if (!dashboard) return;
    updateDashboard(dashboard.id, { name: name.trim() || t('common.untitled'), widgets });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  };

  const configureTarget = configureId ? widgets.find((w) => w.id === configureId) ?? null : null;

  if (!hasHydrated || !bootstrapped) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)]">
        <div className="hidden w-72 border-r border-border bg-card p-4 md:block">
          <Skeleton className="mb-3 h-6 w-32" />
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="mb-2 h-14 w-full" />
          ))}
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="mb-4 h-10 w-72" />
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-6 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/custom-dashboards"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={t('nav.back')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          {editingName ? (
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') setEditingName(false);
              }}
              placeholder={t('builder.namePlaceholder')}
              className="h-9 min-w-0 rounded-md border border-border bg-card px-3 font-heading text-lg font-semibold text-bg-dark focus:border-primary-accent focus:outline-none focus:ring-2 focus:ring-primary-accent/30"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingName(true)}
              className="group flex min-w-0 items-center gap-2 rounded-md px-2 py-1 hover:bg-muted"
            >
              <span className="truncate font-heading text-lg font-semibold text-bg-dark">
                {name || t('builder.namePlaceholder')}
              </span>
              <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {savedFlash && (
            <span className="inline-flex items-center gap-1 text-xs text-success">
              <Check className="h-3.5 w-3.5" />
              {t('builder.saved')}
            </span>
          )}
          <Button variant="secondary" size="sm" onClick={() => setIsPreview((v) => !v)}>
            <Eye className="h-4 w-4" />
            {isPreview ? t('builder.exitPreview') : t('builder.preview')}
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="h-4 w-4" />
            {t('builder.save')}
          </Button>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        {!isPreview && <WidgetLibrary onAdd={addWidget} />}
        <div className="flex-1 overflow-auto bg-bg-light scrollbar-thin">
          <BuilderCanvas
            widgets={widgets}
            isPreview={isPreview}
            onChange={setWidgets}
            onConfigure={setConfigureId}
            onAdd={addWidget}
          />
        </div>
      </div>
      <WidgetConfigDialog
        widget={configureTarget}
        onClose={() => setConfigureId(null)}
        onSave={(cfg) => configureTarget && updateConfig(configureTarget.id, cfg)}
      />
    </div>
  );
}
