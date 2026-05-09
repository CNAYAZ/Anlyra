'use client';

import { useTranslations } from 'next-intl';
import { formatCurrencyCompact, formatMonth } from '@/lib/utils';
import type { Locale } from '@/lib/utils';
import type { HistoricalPoint, ForecastPoint } from './forecast-chart';

type Props = {
  historical: HistoricalPoint[];
  forecast: ForecastPoint[];
  locale: Locale;
};

export function ForecastTable({ historical, forecast, locale }: Props) {
  const t = useTranslations('forecasting');

  const histRows = historical.slice(-6).map((h) => ({
    month: h.month,
    label: formatMonth(`${h.month}-01`, locale),
    historical: h.value,
    forecast: undefined as number | undefined,
    lower: undefined as number | undefined,
    upper: undefined as number | undefined,
    isProjected: false,
  }));

  const fcRows = forecast.map((f) => ({
    month: f.month,
    label: formatMonth(`${f.month}-01`, locale),
    historical: undefined as number | undefined,
    forecast: f.value,
    lower: f.lower,
    upper: f.upper,
    isProjected: true,
  }));

  const rows = [...histRows, ...fcRows];

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="py-3 px-4 text-left font-medium text-muted-foreground">{t('tableMonth')}</th>
            <th className="py-3 px-4 text-right font-medium text-muted-foreground">{t('tableHistorical')}</th>
            <th className="py-3 px-4 text-right font-medium text-muted-foreground">{t('tableForecast')}</th>
            <th className="py-3 px-4 text-right font-medium text-muted-foreground">{t('tableConfidenceBand')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.month}
              className={`border-b border-border last:border-0 ${
                row.isProjected ? 'bg-muted/20' : ''
              }`}
            >
              <td className="py-2.5 px-4 font-medium">
                {row.label}
                {row.isProjected && (
                  <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {t('tableForecast')}
                  </span>
                )}
              </td>
              <td className="py-2.5 px-4 text-right text-muted-foreground">
                {row.historical !== undefined ? formatCurrencyCompact(row.historical, locale) : '—'}
              </td>
              <td className="py-2.5 px-4 text-right font-medium">
                {row.forecast !== undefined ? formatCurrencyCompact(row.forecast, locale) : '—'}
              </td>
              <td className="py-2.5 px-4 text-right text-muted-foreground text-xs">
                {row.lower !== undefined && row.upper !== undefined
                  ? `${formatCurrencyCompact(row.lower, locale)} – ${formatCurrencyCompact(row.upper, locale)}`
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
