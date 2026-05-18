'use client';

import { CalendarRange } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export type Period = '1m' | '3m' | '6m' | '12m' | 'custom';
export type PeriodRange = { period: Period; from?: string; to?: string };

const OPTIONS: Period[] = ['1m', '3m', '6m', '12m'];

export function PeriodFilter({ value, onChange }: { value: PeriodRange; onChange: (p: PeriodRange) => void }) {
  const t = useTranslations('periods');
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(value.from ?? '');
  const [to, setTo] = useState(value.to ?? '');

  const applyCustom = () => {
    if (!from) return;
    onChange({ period: 'custom', from, to: to || undefined });
    setOpen(false);
  };

  return (
    <div className="relative inline-flex items-center gap-1">
      <div className="inline-flex items-center rounded-lg border border-border overflow-hidden text-xs">
        {OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange({ period: opt })}
            className={cn(
              'px-3 py-1.5 font-medium whitespace-nowrap transition-colors',
              value.period === opt
                ? 'bg-primary-accent text-white'
                : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {t(opt)}
          </button>
        ))}
        <button
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'px-3 py-1.5 font-medium whitespace-nowrap flex items-center gap-1 transition-colors border-l border-border',
            value.period === 'custom'
              ? 'bg-primary-accent text-white'
              : 'text-muted-foreground hover:bg-muted',
          )}
        >
          <CalendarRange className="w-3 h-3" />
          {t('custom')}
        </button>
      </div>

      {open && (
        <div className="absolute top-full right-0 mt-1 z-20 p-3 rounded-lg bg-card border border-border shadow-card flex flex-col gap-2 text-xs">
          <label className="flex items-center gap-2">
            <span className="w-10 text-muted-foreground">From</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="px-2 py-1 rounded-md border border-border bg-background" />
          </label>
          <label className="flex items-center gap-2">
            <span className="w-10 text-muted-foreground">To</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="px-2 py-1 rounded-md border border-border bg-background" />
          </label>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => {
                setFrom('');
                setTo('');
                onChange({ period: '12m' });
                setOpen(false);
              }}
              className="px-2 py-1 text-muted-foreground hover:text-foreground"
            >
              Reset
            </button>
            <button onClick={applyCustom} disabled={!from} className="btn-primary px-2 py-1 text-xs disabled:opacity-50">
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
