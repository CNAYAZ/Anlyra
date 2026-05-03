'use client';

import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NoCredits() {
  const t = useTranslations('chat');
  const tt = useTranslations('topbar');
  return (
    <div className="mx-auto max-w-md rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
      <Sparkles className="mx-auto mb-2 h-6 w-6 text-warning" />
      <h3 className="font-heading text-base font-semibold text-amber-900">{t('noCreditsTitle')}</h3>
      <p className="mt-1 text-sm text-amber-800">{t('noCreditsDescription')}</p>
      <Button className="mt-4" size="sm">
        {tt('buyMore')}
      </Button>
    </div>
  );
}
