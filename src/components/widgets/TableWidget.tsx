'use client';

import { useLocale } from 'next-intl';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { getTableRows } from '@/lib/widgets/data';
import type { Widget } from '@/lib/widgets/types';

export function TableWidget({ widget }: { widget: Widget }) {
  const locale = useLocale();
  const period = widget.config.period ?? '30d';
  const rows = getTableRows(period, locale);
  const labels =
    locale === 'it'
      ? { product: 'Prodotto', revenue: 'Fatturato', orders: 'Ordini', margin: 'Margine' }
      : { product: 'Product', revenue: 'Revenue', orders: 'Orders', margin: 'Margin' };

  return (
    <div className="h-full overflow-auto scrollbar-thin">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-card">
          <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
            <th className="py-2 pr-2 font-medium">{labels.product}</th>
            <th className="py-2 pr-2 text-right font-medium">{labels.revenue}</th>
            <th className="py-2 pr-2 text-right font-medium">{labels.orders}</th>
            <th className="py-2 text-right font-medium">{labels.margin}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-border/50 last:border-0">
              <td className="py-2 pr-2 font-medium text-foreground">{r.name}</td>
              <td className="py-2 pr-2 text-right font-mono text-foreground">{formatCurrency(r.revenue, locale)}</td>
              <td className="py-2 pr-2 text-right font-mono text-foreground">{formatNumber(r.orders, locale)}</td>
              <td className="py-2 text-right font-mono text-foreground">
                {formatNumber(r.margin, locale, { maximumFractionDigits: 1 })}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
