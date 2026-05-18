'use client';

import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useCreditsStore } from '@/stores/credits-store';
import { cn } from '@/lib/utils';

function colorFor(n: number): string {
  if (n < 10) return 'text-danger bg-danger/10 border-danger/30';
  if (n <= 20) return 'text-warning bg-warning/10 border-warning/30';
  return 'text-success bg-success/10 border-success/30';
}

export function CreditsBadge() {
  const t = useTranslations('topbar');
  const credits = useCreditsStore((s) => s.credits);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium font-num transition-colors',
            colorFor(credits)
          )}
          aria-label={t('credits')}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>{credits}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold">{t('popoverTitle')}</p>
          <p className="text-sm text-muted-foreground">{t('creditsRemaining', { count: credits })}</p>
          <p className="text-xs text-muted-foreground">{t('popoverHint')}</p>
        </div>
        <Button size="sm" className="w-full">
          {t('buyMore')}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
