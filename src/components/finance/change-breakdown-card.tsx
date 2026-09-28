'use client';

import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardHeader } from '@/components/ui/section';
import type { CategoryChange, ChangeBreakdown } from '@/lib/analysis/financial';
import type { Locale } from '@/i18n/config';
import { cn, formatCurrency, formatDate, formatPercent } from '@/lib/utils';

/** Categories listed one by one; the rest are summed into a single "other N" line. */
const MAX_ROWS = 6;

function signed(value: number, locale: Locale): string {
  return `${value > 0 ? '+' : ''}${formatCurrency(value, locale)}`;
}

function signedPct(value: number, locale: Locale): string {
  return `${value > 0 ? '+' : ''}${formatPercent(value, locale)}`;
}

/**
 * "Cosa è cambiato" on the costs and revenue pages: the categories that moved
 * the total between the selected period and its comparison period. Renders
 * ChangeBreakdown (src/lib/analysis/financial.ts) as it is — no number here is
 * computed, only formatted; when the breakdown says a figure is not available,
 * this says why.
 */
export function ChangeBreakdownCard({
  breakdown,
  totalLabel,
  locale,
}: {
  breakdown: ChangeBreakdown;
  /** "Costi" / "Ricavi" — what the total is. */
  totalLabel: string;
  locale: Locale;
}) {
  const t = useTranslations('whatChanged');
  const b = breakdown;
  const day = (d: string) => formatDate(d, locale);
  const description = b.previousPeriod
    ? t('periods', {
        from: day(b.currentPeriod.from),
        to: day(b.currentPeriod.to),
        prevFrom: day(b.previousPeriod.from),
        prevTo: day(b.previousPeriod.to),
      })
    : undefined;

  if (b.unavailableReason !== null || b.totalChange === null || b.previousTotal === null) {
    return (
      <Card>
        <CardHeader title={t('title')} description={description} />
        <p className="text-sm text-muted-foreground">
          {t(`unavailable.${b.unavailableReason ?? 'NO_PREVIOUS_DATA'}`, {
            prevFrom: b.previousPeriod ? day(b.previousPeriod.from) : '',
            prevTo: b.previousPeriod ? day(b.previousPeriod.to) : '',
          })}
        </p>
      </Card>
    );
  }

  const moved = b.categories.filter((c) => c.change !== 0);
  const shown = moved.slice(0, MAX_ROWS);
  const rest = moved.slice(MAX_ROWS);
  const restChange = rest.reduce((s, c) => s + Math.round(c.change * 100), 0) / 100;
  const up = shown.filter((c) => c.change > 0);
  const down = shown.filter((c) => c.change < 0);
  const name = (c: CategoryChange) => (c.uncategorized ? t('uncategorized') : c.category.replace(/_/g, ' '));

  const group = (title: string, rows: CategoryChange[], direction: 'up' | 'down') =>
    rows.length === 0 ? null : (
      <div className="space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-fg-3">{title}</p>
        <ul className="space-y-2">
          {rows.map((c) => (
            <li
              key={`${c.uncategorized ? '∅' : ''}${c.category}`}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 text-sm"
            >
              <span className="flex items-center gap-1.5 min-w-0">
                {direction === 'up' ? (
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-fg-3" aria-hidden />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5 shrink-0 text-fg-3" aria-hidden />
                )}
                <span className={cn('truncate', c.uncategorized && 'italic')}>{name(c)}</span>
                {c.presence !== 'both' && (
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-fg-2">
                    {t(`presence.${c.presence}`)}
                  </span>
                )}
              </span>
              <span className="flex items-baseline gap-3 tabular-nums">
                <span className="text-xs text-muted-foreground">
                  {formatCurrency(c.previous, locale)} → {formatCurrency(c.current, locale)}
                </span>
                <span className="font-medium">{signed(c.change, locale)}</span>
                {c.share !== null && (
                  <span className="text-xs text-muted-foreground">
                    {t('share', { share: formatPercent(c.share, locale) })}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );

  return (
    <Card>
      <CardHeader title={t('title')} description={description} />
      <div className="space-y-4">
        <p className="text-sm">
          <span className="font-medium">{totalLabel}</span>{' '}
          <span className="font-medium tabular-nums">{signed(b.totalChange, locale)}</span>
          {b.totalChangePct !== null && (
            <span className="tabular-nums text-muted-foreground"> ({signedPct(b.totalChangePct, locale)})</span>
          )}
          <span className="text-muted-foreground">
            {' '}
            {t('fromTo', {
              previous: formatCurrency(b.previousTotal, locale),
              current: formatCurrency(b.currentTotal, locale),
            })}
          </span>
        </p>

        {b.sharesHiddenReason !== null && (
          <p className="text-xs text-muted-foreground">{t(`sharesHidden.${b.sharesHiddenReason}`)}</p>
        )}
        {b.sharesHiddenReason === null && b.mixedDirections && (
          <p className="text-xs text-muted-foreground">{t('mixedDirections')}</p>
        )}
        {b.categoriesLookLikeFreeText && (
          <p className="text-xs text-muted-foreground">{t('freeText')}</p>
        )}

        {group(t('groupUp'), up, 'up')}
        {group(t('groupDown'), down, 'down')}

        {rest.length > 0 && (
          <p className="text-xs text-muted-foreground tabular-nums">
            {t('rest', { count: rest.length, change: signed(restChange, locale) })}
          </p>
        )}
      </div>
    </Card>
  );
}
