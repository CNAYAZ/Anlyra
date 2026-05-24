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
        'hidden sm:inline-flex h-8 items-center gap-2 rounded-full px-3 text-xs font-medium tabular-nums transition-all duration-150',
        'hover:ring-1 hover:ring-sage-200 dark:hover:ring-sage-600',
        low
          ? 'bg-warning-50 text-warning-700'
          : 'bg-sage-50 text-sage-700 dark:bg-sage-700/30 dark:text-sage-300',
      )}
    >
      <Sparkles className="h-3 w-3" />
      <span>{credits}</span>
    </Link>
  );
}
