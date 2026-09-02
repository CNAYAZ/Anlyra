'use client';

export const dynamic = 'force-dynamic';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, Plus, Save, Trash2, GripVertical, AlertCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api/fetcher';
import { FormError } from '@/components/ui/form-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  WIDGET_CATALOG,
  WIDGET_PERIODS,
  WIDGET_METRICS,
  DEFAULT_PERIOD,
  DEFAULT_METRIC,
  catalogEntry,
  type WidgetType,
  type WidgetConfig,
  type WidgetPeriod,
  type WidgetMetric,
} from '@/lib/dashboard-widgets';
import { cn } from '@/lib/utils';

function uid() {
  return 'w_' + Math.random().toString(36).slice(2, 9);
}

export default function CustomDashboardsBuilderPage() {
  const t = useTranslations('customDashboards');
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  /** Form-level error (next to Save); the name error goes under its field. */
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: (body: unknown) =>
      apiFetch<{ id: string }>('/api/custom-dashboards', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      router.push('/custom-dashboards');
    },
    // Server failures here are not field-attributable, so they stay form-level.
    onError: (e) => setError((e as Error).message),
  });

  function addWidget(type: WidgetType, defaultLabelKey: string) {
    const entry = catalogEntry(type);
    // Seed only the options this type offers, so a widget never carries a
    // setting its renderer ignores.
    const config: { period?: WidgetPeriod; metric?: WidgetMetric } = {};
    if (entry?.options.includes('period')) config.period = DEFAULT_PERIOD;
    if (entry?.options.includes('metric')) config.metric = DEFAULT_METRIC;
    setWidgets((prev) => [
      ...prev,
      { id: uid(), type, title: t(defaultLabelKey as 'widgetKpiRevenue'), config },
    ]);
  }

  function updateOption(id: string, patch: { period?: WidgetPeriod; metric?: WidgetMetric }) {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, config: { ...w.config, ...patch } } : w)),
    );
  }

  function updateTitle(id: string, title: string) {
    setWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, title } : w)));
  }

  function removeWidget(id: string) {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
  }

  function move(id: string, dir: -1 | 1) {
    setWidgets((prev) => {
      const idx = prev.findIndex((w) => w.id === id);
      if (idx === -1) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      return copy;
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNameError(null);
    if (!name.trim()) {
      // The name box is the first field of a long builder — focus it, or the
      // message lands under a field the user has already scrolled past.
      setNameError(t('errorNameRequired'));
      nameRef.current?.focus();
      nameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (widgets.length === 0) {
      // About the widget list as a whole, not one input → form-level.
      setError(t('errorWidgetsRequired'));
      return;
    }
    mutation.mutate({ name: name.trim(), description: description.trim() || undefined, widgets });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold">{t('builderTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('builderSubtitle')}</p>
        </div>
        <Link
          href="/custom-dashboards"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" /> {t('back')}
        </Link>
      </div>

      <form onSubmit={submit} className="space-y-6">
        <div className="card space-y-4">
          <h2 className="font-heading text-lg font-semibold">{t('builderInfo')}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="dash-name">{t('builderName')} *</Label>
              <Input
                id="dash-name"
                ref={nameRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('builderNamePlaceholder')}
                aria-invalid={nameError ? true : undefined}
                aria-describedby={nameError ? 'dash-name-err' : undefined}
                data-invalid={nameError ? 'true' : undefined}
              />
              {nameError && (
                <p id="dash-name-err" role="alert" className="flex items-center gap-1.5 text-xs text-danger">
                  <AlertCircle className="h-3 w-3 shrink-0" aria-hidden />
                  {nameError}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="dash-desc">{t('builderDescription')}</Label>
              <Input id="dash-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="card lg:col-span-1">
            <h2 className="mb-3 font-heading text-lg font-semibold">{t('builderCatalog')}</h2>
            <div className="space-y-2">
              {WIDGET_CATALOG.map((w) => (
                <button
                  key={w.type}
                  type="button"
                  onClick={() => addWidget(w.type, w.labelKey)}
                  className="flex w-full items-start gap-2 rounded-lg border border-border bg-card p-2 text-left text-xs hover:border-primary-accent hover:bg-muted"
                >
                  <Plus className="mt-0.5 h-3 w-3 text-primary-accent shrink-0" />
                  <div>
                    <p className="font-medium">{t(w.labelKey as 'widgetKpiRevenue')}</p>
                    <p className="text-[11px] text-muted-foreground">{t(w.descKey as 'widgetKpiRevenueDesc')}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-3">
            <h2 className="font-heading text-lg font-semibold">{t('builderLayout')} ({widgets.length})</h2>
            {widgets.length === 0 ? (
              <div className="card flex items-center justify-center py-12 text-sm text-muted-foreground">
                {t('builderLayoutEmpty')}
              </div>
            ) : (
              <div className="space-y-2">
                {widgets.map((w, i) => (
                  <div key={w.id} className="card flex items-center gap-2">
                    <span className="flex flex-col text-muted-foreground">
                      <button type="button" onClick={() => move(w.id, -1)} disabled={i === 0} className="disabled:opacity-30">▲</button>
                      <button type="button" onClick={() => move(w.id, 1)} disabled={i === widgets.length - 1} className="disabled:opacity-30">▼</button>
                    </span>
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={w.title}
                      onChange={(e) => updateTitle(w.id, e.target.value)}
                      className="flex-1"
                    />
                    {/* Only the options this widget type actually uses are
                        offered — a KPI has no metric to pick, a forecast has
                        no period. Saved into `config`, which the API schema
                        already accepted before this change. */}
                    {catalogEntry(w.type)?.options.includes('period') && (
                      <select
                        value={w.config?.period ?? DEFAULT_PERIOD}
                        onChange={(e) => updateOption(w.id, { period: e.target.value as WidgetPeriod })}
                        aria-label={t('builderPeriod')}
                        className="rounded-md border border-border bg-card px-2 py-1 text-xs"
                      >
                        {WIDGET_PERIODS.map((p) => (
                          <option key={p} value={p}>{t(`period_${p}` as 'period_12m')}</option>
                        ))}
                      </select>
                    )}
                    {catalogEntry(w.type)?.options.includes('metric') && (
                      <select
                        value={w.config?.metric ?? DEFAULT_METRIC}
                        onChange={(e) => updateOption(w.id, { metric: e.target.value as WidgetMetric })}
                        aria-label={t('builderMetric')}
                        className="rounded-md border border-border bg-card px-2 py-1 text-xs"
                      >
                        {WIDGET_METRICS.map((m) => (
                          <option key={m} value={m}>{t(`metric_${m}` as 'metric_revenue')}</option>
                        ))}
                      </select>
                    )}
                    <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                      {w.type}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeWidget(w.id)}
                      className="rounded p-1 text-muted-foreground hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Form-level error next to the button the user just pressed — the
            old banner at the top of this long builder was off-screen. */}
        <FormError>{error}</FormError>

        <div className="flex justify-end gap-2">
          <Link
            href="/custom-dashboards"
            className="inline-flex items-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            {t('cancel')}
          </Link>
          <button
            type="submit"
            disabled={mutation.isPending}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg bg-primary-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90',
              mutation.isPending && 'opacity-60',
            )}
          >
            <Save className="h-4 w-4" /> {mutation.isPending ? t('saving') : t('saveDashboard')}
          </button>
        </div>
      </form>
    </div>
  );
}
