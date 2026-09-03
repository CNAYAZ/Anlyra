'use client';

import { useTranslations } from 'next-intl';
import { Info } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useIsDemo } from '@/lib/demo/context';

/**
 * Always-visible notice that the numbers on screen are demonstration data.
 *
 * Deliberately built as the same kind of strip as TrialExpiredBanner — same
 * shape, same place, same "pushes content down rather than covering it"
 * behaviour — so it reads as part of the product instead of a bolted-on alert,
 * and so the two can never overlap each other.
 *
 * Colour is the neutral/info tone, not a warning: nothing is wrong, the visitor
 * simply needs to know whose numbers these are. It is not dismissible on
 * purpose — a visitor who closed it could go on reading invented figures as if
 * they were a real company's, which is the whole problem this exists to prevent.
 */
export function DemoBanner() {
  const t = useTranslations('demo.banner');
  const isDemo = useIsDemo();

  if (!isDemo) return null;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-primary-accent/30 bg-primary-accent/10 px-4 py-2.5 text-sm text-foreground sm:px-6"
    >
      <Info className="h-4 w-4 shrink-0 text-primary-accent" aria-hidden />
      <span className="min-w-[200px] flex-1">{t('message')}</span>
      <Link
        href="/signup"
        className="inline-flex shrink-0 items-center rounded-lg bg-sage-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-sage-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 focus-visible:ring-offset-2"
      >
        {t('cta')}
      </Link>
    </div>
  );
}
