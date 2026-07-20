'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useBilling } from '@/lib/billing/context';

/**
 * Informational strip shown at the top of the dashboard when the org's billing
 * status is neither 'active' nor 'trialing' (i.e. an expired trial or past_due).
 * It is a strip that pushes the content down — NOT a blocking overlay — so the
 * data stays readable in read-only mode. Renders nothing for active/trialing.
 *
 * Reads the status from the client BillingProvider (mounted in the dashboard
 * layout), so it needs no props. The CTA uses the locale-aware next-intl Link to
 * the in-app billing page where the user picks/manages a plan.
 */
export function TrialExpiredBanner() {
  const t = useTranslations('billing.trialExpiredBanner');
  const { state } = useBilling();

  if (state.status === 'active' || state.status === 'trialing') return null;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-warning-500/30 bg-warning-50 px-4 py-2.5 text-sm text-warning-700 dark:bg-warning-500/10 dark:text-warning-50 sm:px-6"
    >
      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-[200px] flex-1">{t('message')}</span>
      <Link
        href="/settings/billing"
        className="inline-flex shrink-0 items-center rounded-lg bg-sage-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-sage-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 focus-visible:ring-offset-2"
      >
        {t('cta')}
      </Link>
    </div>
  );
}
