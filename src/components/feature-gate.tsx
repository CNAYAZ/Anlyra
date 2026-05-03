'use client';

import { useTranslations } from 'next-intl';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { useSession } from '@/lib/session-store';
import { hasPlan, type Plan } from '@/lib/plans';

export function FeatureGate({
  required,
  children
}: {
  required: Plan;
  children: React.ReactNode;
}) {
  const t = useTranslations('feature');
  const plan = useSession((s) => s.plan);

  if (hasPlan(plan, required)) return <>{children}</>;

  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-500">
        <Lock className="h-5 w-5" />
      </div>
      <h3 className="mt-3 font-heading text-lg font-semibold text-slate-900">{t('locked')}</h3>
      <p className="mt-1 text-sm text-slate-500">
        {t('lockedDescription', { plan: required.charAt(0) + required.slice(1).toLowerCase() })}
      </p>
      <Button asChild className="mt-4">
        <Link href="/#pricing">{t('upgrade')}</Link>
      </Button>
    </div>
  );
}
