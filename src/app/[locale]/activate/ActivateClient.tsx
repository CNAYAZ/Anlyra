'use client';

import { Suspense, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { PLANS, type PlanId } from '@/lib/billing/plans';
import { TrialCheckoutConfirm } from '@/components/billing/TrialCheckoutConfirm';
import { CheckoutReturnNotice } from '@/components/billing/CheckoutReturnNotice';
import { COMPANY } from '@/lib/company';
import { TRIAL_CREDITS, TRIAL_DAYS } from '@/lib/billing/trial-constants';
import { cn } from '@/lib/utils';

const SELF_SERVE_PLANS: PlanId[] = ['PRO', 'ADVANCED'];

/**
 * The plan, then the step before the card (TrialCheckoutConfirm). Owner only:
 * the other members are told the owner must activate the company.
 */
export function ActivateClient({ isOwner, activated }: { isOwner: boolean; activated: boolean }) {
  const t = useTranslations('activate');
  const tPlans = useTranslations();
  const locale = useLocale();
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [plan, setPlan] = useState<PlanId | null>(null);
  const euro = (cents: number) =>
    new Intl.NumberFormat(locale === 'en' ? 'en-IE' : 'it-IT', { style: 'currency', currency: 'EUR' }).format(cents / 100);

  return (
    <div className="space-y-4">
      <Suspense fallback={null}>
        <CheckoutReturnNotice scope="subscription" />
      </Suspense>
      {activated ? (
        <a
          href={`/${locale}/overview`}
          className="inline-block rounded-lg bg-sage-500 px-4 py-2 text-sm font-medium text-white hover:bg-sage-600"
        >
          {t('goToDashboard')}
        </a>
      ) : !isOwner ? (
        <p className="rounded-lg border border-border bg-card p-4 text-sm text-fg-2">{t('ownerOnly')}</p>
      ) : (
        <>
          <p className="text-sm text-fg-2 tabular-nums">{t('trialLine', { days: TRIAL_DAYS, credits: TRIAL_CREDITS })}</p>
          <div className="inline-flex rounded-lg border border-border bg-card p-1">
            {(['monthly', 'yearly'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCycle(c)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium',
                  cycle === c ? 'bg-sage-500 text-white' : 'text-fg-3 hover:text-foreground',
                )}
              >
                {t(c)}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {SELF_SERVE_PLANS.map((id) => {
              const p = PLANS[id];
              const cents = cycle === 'yearly' ? p.pricing.yearlyCents : p.pricing.monthlyCents;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPlan(id)}
                  className={cn(
                    'rounded-lg border bg-card p-4 text-left shadow-elev-1 transition-colors',
                    plan === id ? 'border-sage-500 ring-1 ring-sage-500' : 'border-border hover:border-sage-500',
                  )}
                >
                  <p className="font-heading text-base font-semibold text-foreground">
                    {tPlans(p.nameKey as 'billing.plans.pro.name')}
                  </p>
                  <p className="mt-1 text-sm tabular-nums text-fg-2">
                    {euro(cents)} {cycle === 'yearly' ? t('perYear') : t('perMonth')}
                  </p>
                  <p className="mt-1 text-xs tabular-nums text-fg-3">{t('credits', { count: p.limits.aiCredits })}</p>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-fg-3">{t('enterprise', { email: COMPANY.contactEmail })}</p>
          {plan && <TrialCheckoutConfirm key={`${plan}-${cycle}`} plan={plan} cycle={cycle} onCancel={() => setPlan(null)} />}
        </>
      )}
    </div>
  );
}
