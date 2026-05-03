'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea } from '@/components/ui/input';
import { METRIC_KEYS, PERIOD_KEYS, WIDGET_META, widgetConfigSchema, type Widget, type WidgetConfig } from '@/lib/widgets/types';

interface WidgetConfigDialogProps {
  widget: Widget | null;
  onClose: () => void;
  onSave: (config: WidgetConfig) => void;
}

const COLOR_OPTIONS = ['#3b82f6', '#1e3a5f', '#0d9488', '#16a34a', '#f59e0b', '#dc2626', '#8b5cf6'];

export function WidgetConfigDialog({ widget, onClose, onSave }: WidgetConfigDialogProps) {
  const t = useTranslations('builder.config');
  const tCommon = useTranslations('common');
  const tMetrics = useTranslations('metrics');
  const tPeriods = useTranslations('periods');
  const tWidgets = useTranslations('widgets');

  const meta = widget ? WIDGET_META[widget.type] : null;

  const form = useForm<WidgetConfig>({
    resolver: zodResolver(widgetConfigSchema),
    defaultValues: widget?.config ?? {},
  });

  React.useEffect(() => {
    if (widget) form.reset(widget.config);
  }, [widget, form]);

  if (!widget || !meta) return null;

  const submit = form.handleSubmit((values) => {
    const cleaned: WidgetConfig = {};
    if (meta.configurable.includes('title')) cleaned.title = values.title?.trim() || undefined;
    if (meta.configurable.includes('metric')) cleaned.metric = values.metric;
    if (meta.configurable.includes('period')) cleaned.period = values.period;
    if (meta.configurable.includes('color')) cleaned.color = values.color;
    if (meta.configurable.includes('text')) cleaned.text = values.text;
    onSave(cleaned);
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title={`${t('title')} · ${tWidgets(`${widget.type}.name`)}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} type="button">
            {tCommon('cancel')}
          </Button>
          <Button onClick={submit} type="button">
            {tCommon('save')}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={submit}>
        {meta.configurable.includes('title') && (
          <div>
            <Label htmlFor="title">{t('widgetTitle')}</Label>
            <Input id="title" placeholder={tWidgets(`${widget.type}.name`)} {...form.register('title')} />
          </div>
        )}
        {meta.configurable.includes('metric') && (
          <div>
            <Label htmlFor="metric">{t('metric')}</Label>
            <Controller
              control={form.control}
              name="metric"
              render={({ field }) => (
                <Select id="metric" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value)}>
                  {METRIC_KEYS.map((m) => (
                    <option key={m} value={m}>
                      {tMetrics(m)}
                    </option>
                  ))}
                </Select>
              )}
            />
          </div>
        )}
        {meta.configurable.includes('period') && (
          <div>
            <Label htmlFor="period">{t('period')}</Label>
            <Controller
              control={form.control}
              name="period"
              render={({ field }) => (
                <Select id="period" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value)}>
                  {PERIOD_KEYS.map((p) => (
                    <option key={p} value={p}>
                      {tPeriods(p)}
                    </option>
                  ))}
                </Select>
              )}
            />
          </div>
        )}
        {meta.configurable.includes('color') && (
          <div>
            <Label>{t('color')}</Label>
            <Controller
              control={form.control}
              name="color"
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => field.onChange(c)}
                      className={`h-8 w-8 rounded-full border-2 transition-transform ${field.value === c ? 'scale-110 border-bg-dark' : 'border-white shadow'}`}
                      style={{ background: c }}
                      aria-label={c}
                    />
                  ))}
                </div>
              )}
            />
          </div>
        )}
        {meta.configurable.includes('text') && (
          <div>
            <Label htmlFor="text">{t('text')}</Label>
            <Textarea id="text" rows={5} {...form.register('text')} />
          </div>
        )}
        {meta.configurable.length === 0 && <p className="text-sm text-slate-500">{t('noOptions')}</p>}
      </form>
    </Dialog>
  );
}
