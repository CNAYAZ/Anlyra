'use client';

import { Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

export function CreditsCounter({ credits = 100 }: { credits?: number }) {
  const t = useTranslations('topbar');
  return (
    <Link
      href="/settings/billing"
      title={t('credits')}
      className="hidden sm:flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm cursor-pointer hover:bg-muted transition-colors"
    >
      <Sparkles className="h-4 w-4 text-accent" />
      <span className="font-mono font-medium">{credits}</span>
    </Link>
  );
}
