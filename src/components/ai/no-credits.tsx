'use client';

import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export function NoCredits() {
  const t = useTranslations('chat');
  const tCommon = useTranslations('common');
  return (
    <div className="mx-auto max-w-md rounded-lg border border-warning/30 bg-warning/10 p-6 text-center">
      <Sparkles className="mx-auto mb-2 h-6 w-6 text-warning" />
      <h3 className="font-heading text-base font-semibold text-foreground">{t('noCreditsTitle')}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{t('noCreditsDescription')}</p>
      {/* Real navigation to Billing (asChild + i18n Link keeps the locale
          prefix — see i18n/navigation.ts for why a plain <a>/next/link would
          drop it). Previously a plain <Button> with no onClick: pressing it
          did nothing. */}
      <Button asChild className="mt-4" size="sm">
        <Link href="/settings/billing">{tCommon('upgrade')}</Link>
      </Button>
    </div>
  );
}
