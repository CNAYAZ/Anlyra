'use client';

import { Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import { useCreditsStore } from '@/stores/credits-store';

export function CreditsCounter() {
  const t = useTranslations('topbar');
  const credits = useCreditsStore((s) => s.credits);
  const low = typeof credits === 'number' && credits < 10;
  return (
    <Link
      href="/settings/billing"
      title={t('credits')}
      className={cn(
        'hidden sm:inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium tabular-nums transition-colors',
        low
          ? 'bg-warning-50 text-warning-700'
          : 'bg-sage-50 text-sage-700 dark:bg-sage-700/30 dark:text-sage-300',
      )}
    >
      <Sparkles className="h-3.5 w-3.5" />
      <span>{credits}</span>
    </Link>
  );
}
