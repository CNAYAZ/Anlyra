'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useFeatureGate } from '@/lib/billing/context';
import type { FeatureKey } from '@/lib/billing/plans';
import { cn } from '@/lib/utils';

/**
 * One line under a control the organization's plan does not include: which
 * plan includes it, and a link to change plan. Renders nothing when the plan
 * has the feature. Same idea as the ownerOnly / manager-only lines next to the
 * billing and team controls: the control is disabled, and this says why. The
 * server refuses the action anyway (requireFeaturePlan).
 */
export function PlanLockedNote({ feature, className }: { feature: FeatureKey; className?: string }) {
  const t = useTranslations('feature');
  const tBilling = useTranslations('billing');
  const { hasAccess, requiredPlan } = useFeatureGate(feature);
  if (hasAccess) return null;

  const plan = requiredPlan ? tBilling(`plans.${requiredPlan.toLowerCase()}.name`) : '';
  return (
    <p className={cn('text-[11px] text-fg-3', className)}>
      {t('lockedDescription', { plan })}{' '}
      <Link href="/settings/billing" className="font-medium text-sage-700 underline dark:text-sage-300">
        {t('upgrade')}
      </Link>
    </p>
  );
}
