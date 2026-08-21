'use client';

import { useTranslations } from 'next-intl';
import { Progress } from '@/components/ui/progress';

export function OnboardingProgress({ current, total }: { current: number; total: number }) {
  const t = useTranslations('onboarding');
  const tc = useTranslations('common');
  const value = (current / total) * 100;
  return (
    <div className="border-b border-border bg-card">
      <div className="container py-3">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>{tc('appName')}</span>
          <span>{t('progress', { current, total })}</span>
        </div>
        <Progress value={value} className="mt-2" />
      </div>
    </div>
  );
}
