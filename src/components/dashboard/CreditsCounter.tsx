'use client';

import { Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function CreditsCounter({ credits = 100 }: { credits?: number }) {
  const t = useTranslations('topbar');
  return (
    <div
      className="hidden sm:flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm"
      title={t('credits')}
    >
      <Sparkles className="h-4 w-4 text-accent" />
      <span className="font-mono font-medium">{credits}</span>
    </div>
  );
}
