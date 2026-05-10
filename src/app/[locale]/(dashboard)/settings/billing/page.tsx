'use client';

export const dynamic = 'force-dynamic';

import { useTranslations } from 'next-intl';
import { Sparkles, Crown, Check } from 'lucide-react';
import { usePlan } from '@/lib/billing/context';
import { PLANS, type PlanId } from '@/lib/billing/plans';
import { cn } from '@/lib/utils';

const PLAN_ORDER: PlanId[] = ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'];

export default function SettingsBillingPage() {
  const t = useTranslations('settings');
  const plan = usePlan();
  const currentPlanId = plan.plan;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold">{t('billingTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('billingSubtitle')}</p>
      </div>

      <div className="card flex flex-wrap items-center gap-4">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary-accent/10 text-primary-accent">
          <Crown className="h-6 w-6" />
        </span>
        <div className="flex-1 min-w-[200px]">
          <p className="text-xs font-medium text-muted-foreground">{t('billingCurrentPlan')}</p>
          <p className="font-heading text-2xl font-semibold uppercase">{currentPlanId}</p>
          <p className="text-xs text-muted-foreground">
            {t('billingStatus')}: <span className="font-medium">{plan.status}</span>
            {plan.periodEnd && (
              <> · {t('billingRenewsOn')} {new Date(plan.periodEnd).toLocaleDateString()}</>
            )}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">{t('billingCredits')}</p>
          <p className="font-heading text-2xl font-semibold">{plan.aiCreditsBalance}</p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-heading text-lg font-semibold">{t('billingAvailablePlans')}</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {PLAN_ORDER.map((planId) => {
            const p = PLANS[planId];
            const isCurrent = planId === currentPlanId;
            const monthly = (p.pricing.monthlyCents / 100).toFixed(0);
            return (
              <div
                key={planId}
                className={cn(
                  'card flex flex-col gap-3',
                  isCurrent && 'border-primary-accent ring-2 ring-primary-accent/30',
                  p.highlight && 'bg-primary-accent/5',
                )}
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="font-heading text-lg font-semibold uppercase">{planId}</h3>
                  {isCurrent && (
                    <span className="rounded-full border border-primary-accent/40 bg-primary-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary-accent">
                      {t('billingCurrent')}
                    </span>
                  )}
                </div>
                <p className="font-heading text-3xl font-bold">
                  €{monthly}
                  <span className="text-sm font-normal text-muted-foreground">/{t('billingPerMonth')}</span>
                </p>
                <ul className="space-y-1.5 text-xs">
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-success" />
                    <span>{p.limits.users} {t('billingUsers')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-success" />
                    <span>{p.limits.aiCredits} {t('billingAiCredits')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-success" />
                    <span>{p.features.length} {t('billingFeatures')}</span>
                  </li>
                </ul>
                <button
                  type="button"
                  disabled={isCurrent}
                  className={cn(
                    'mt-auto rounded-lg px-3 py-2 text-sm font-medium',
                    isCurrent
                      ? 'cursor-not-allowed bg-muted text-muted-foreground'
                      : 'bg-primary-accent text-white hover:opacity-90',
                  )}
                >
                  {isCurrent ? t('billingCurrent') : t('billingUpgrade')}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card flex items-center gap-3">
        <Sparkles className="h-5 w-5 text-primary-accent" />
        <p className="text-sm text-muted-foreground">{t('billingNote')}</p>
      </div>
    </div>
  );
}
