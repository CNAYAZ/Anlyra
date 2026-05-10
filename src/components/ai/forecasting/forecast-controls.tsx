'use client';

import { useTranslations } from 'next-intl';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type ForecastMetric = 'revenue' | 'costs' | 'margin';
export type ForecastHorizon = '3' | '6' | '12';
export type ForecastModel = 'linear' | 'moving_avg' | 'exponential';

export type ForecastControlValues = {
  metric: ForecastMetric;
  horizon: ForecastHorizon;
  model: ForecastModel;
};

type Props = {
  values: ForecastControlValues;
  onChange: (values: ForecastControlValues) => void;
};

export function ForecastControls({ values, onChange }: Props) {
  const t = useTranslations('forecasting');

  return (
    <div className="flex flex-wrap gap-4">
      <div className="flex flex-col gap-1 min-w-[160px]">
        <label className="text-xs font-medium text-muted-foreground">{t('metric')}</label>
        <Select
          value={values.metric}
          onValueChange={(v) => onChange({ ...values, metric: v as ForecastMetric })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="revenue">{t('metricRevenue')}</SelectItem>
            <SelectItem value="costs">{t('metricCosts')}</SelectItem>
            <SelectItem value="margin">{t('metricMargin')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1 min-w-[160px]">
        <label className="text-xs font-medium text-muted-foreground">{t('horizon')}</label>
        <Select
          value={values.horizon}
          onValueChange={(v) => onChange({ ...values, horizon: v as ForecastHorizon })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">{t('horizon3')}</SelectItem>
            <SelectItem value="6">{t('horizon6')}</SelectItem>
            <SelectItem value="12">{t('horizon12')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1 min-w-[160px]">
        <label className="text-xs font-medium text-muted-foreground">{t('model')}</label>
        <Select
          value={values.model}
          onValueChange={(v) => onChange({ ...values, model: v as ForecastModel })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="exponential">{t('modelExponential')}</SelectItem>
            <SelectItem value="linear">{t('modelLinear')}</SelectItem>
            <SelectItem value="moving_avg">{t('modelMovingAvg')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
