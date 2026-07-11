'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Crown, Shield } from 'lucide-react';
import { usePlan } from '@/lib/billing/context';
import { PLANS, type PlanId } from '@/lib/billing/plans';
import { useCreditsStore } from '@/stores/credits-store';
import { cn } from '@/lib/utils';

const VISIBLE_PLANS: PlanId[] = ['PRO', 'ADVANCED', 'ENTERPRISE'];

export default function SettingsBillingPage() {
  const t = useTranslations('settings');
  const tBilling = useTranslations('billing');
  const tPricing = useTranslations('pricing');
  const aiCredits = useCreditsStore((s) => s.credits);
  const plan = usePlan();
  const currentPlanId = plan.plan;
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [busyPlan, setBusyPlan] = useState<PlanId | null>(null);
  const [checkoutError, setCheckoutError] = useState<{ plan: PlanId; message: string } | null>(null);

  // Same flow as components/billing/UpgradeButton: POST the checkout, redirect to
  // the returned Stripe URL, surface the error otherwise.
  async function startCheckout(planId: PlanId) {
    setBusyPlan(planId);
    setCheckoutError(null);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, cycle }),
      });
      const json = (await res.json()) as { success: boolean; data?: { url: string }; error?: string };
      if (json.success && json.data?.url) {
        window.location.href = json.data.url;
      } else {
        setCheckoutError({ plan: planId, message: json.error ?? 'Checkout failed' });
        setBusyPlan(null);
      }
    } catch (e) {
      setCheckoutError({ plan: planId, message: (e as Error).message });
      setBusyPlan(null);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* ── Title ── */}
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">{t('billingTitle')}</h1>
        <p className="text-sm text-fg-2 mt-0.5">{t('billingSubtitle')}</p>
      </div>

      {/* ── Current plan status ── */}
      <div className="rounded-lg border border-border bg-card p-4 flex flex-wrap items-center gap-4 shadow-elev-1">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-sage-50 text-sage-600 dark:bg-sage-700/30 dark:text-sage-300 shrink-0">
          <Crown className="h-5 w-5" />
        </span>
        <div className="flex-1 min-w-[160px]">
          <p className="text-[11px] font-medium uppercase tracking-wider text-fg-3">
            {t('billingCurrentPlan')}
          </p>
          <p className="font-heading text-xl font-semibold text-foreground capitalize">
            {currentPlanId.charAt(0) + currentPlanId.slice(1).toLowerCase()}
          </p>
          <p className="text-xs text-fg-3">
            {t('billingStatus')}: <span className="font-medium">{plan.status}</span>
            {plan.periodEnd && (
              <> · {t('billingRenewsOn')} {new Date(plan.periodEnd).toLocaleDateString('it-IT')}</>
            )}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] font-medium uppercase tracking-wider text-fg-3">{t('billingCredits')}</p>
          <p className="font-heading text-xl font-semibold tabular-nums text-foreground">{aiCredits}</p>
        </div>
      </div>

      {/* ── Plans ── */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-heading text-lg font-semibold text-foreground">{t('billingAvailablePlans')}</h2>
          {/* Monthly / Annual toggle */}
          <div className="inline-flex items-center rounded-full border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => setCycle('monthly')}
              className={cn(
                'rounded-full px-3 py-1 text-sm font-medium transition-colors',
                cycle === 'monthly' ? 'bg-sage-500 text-white' : 'text-fg-3 hover:text-foreground',
              )}
            >
              Mensile
            </button>
            <button
              type="button"
              onClick={() => setCycle('yearly')}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors',
                cycle === 'yearly' ? 'bg-sage-500 text-white' : 'text-fg-3 hover:text-foreground',
              )}
            >
              Annuale
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-semibold transition-colors',
                  cycle === 'yearly' ? 'bg-white/20 text-white' : 'bg-sage-50 text-sage-700 dark:bg-sage-700/30 dark:text-sage-300',
                )}
              >
                -17%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {VISIBLE_PLANS.map((planId) => {
            const p = PLANS[planId];
            const isCurrent = planId === currentPlanId;
            const pricingKey = planId === 'ADVANCED' ? 'advanced' : planId.toLowerCase() as 'pro' | 'enterprise';
            const priceMonthly = tPricing(`plans.${pricingKey}.priceMonthly` as 'plans.pro.priceMonthly');
            const priceAnnual = tPricing(`plans.${pricingKey}.priceAnnual` as 'plans.pro.priceAnnual');
            const priceLabel = p.contact ? tPricing('plans.enterprise.priceLabel') : undefined;
            const features = tPricing.raw(`plans.${pricingKey}.features` as 'plans.pro.features') as string[];
            const featuresPrefix = planId !== 'PRO'
              ? tPricing(`plans.${pricingKey}.featuresPrefix` as 'plans.advanced.featuresPrefix')
              : undefined;
            const displayPrice = p.contact
              ? priceLabel
              : cycle === 'monthly'
                ? priceMonthly
                : priceAnnual;

            return (
              <div
                key={planId}
                className={cn(
                  'relative rounded-lg border bg-card flex flex-col gap-3.5 p-5 shadow-elev-1',
                  isCurrent && 'border-sage-500 ring-2 ring-sage-500/20',
                  p.highlight && !isCurrent && 'border-sage-500/40',
                )}
              >
                {/* Popular badge */}
                {p.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 pointer-events-none">
                    <span className="inline-block rounded-full bg-sage-500 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white whitespace-nowrap shadow-sm">
                      {tBilling('plans.advanced.badge')}
                    </span>
                  </div>
                )}

                {/* Header */}
                <div className={cn('flex items-start justify-between gap-2', p.highlight && 'mt-1')}>
                  <h3 className="font-heading text-lg font-semibold text-foreground">
                    {tBilling(`plans.${pricingKey}.name` as 'plans.pro.name')}
                  </h3>
                  {isCurrent && (
                    <span className="rounded-full border border-sage-500/40 bg-sage-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-sage-700 dark:bg-sage-700/20 dark:text-sage-300 shrink-0">
                      {t('billingCurrent')}
                    </span>
                  )}
                </div>

                {/* Price */}
                <div>
                  <p className="font-heading text-3xl font-bold text-foreground tabular-nums">
                    {displayPrice}
                    {!p.contact && (
                      <span className="text-sm font-normal text-fg-3 ml-0.5">
                        {cycle === 'monthly' ? '/mese' : '/anno'}
                      </span>
                    )}
                  </p>
                  {p.contact && (
                    <p className="text-xs text-fg-3 mt-0.5">
                      {tPricing('plans.enterprise.taglineSub')}
                    </p>
                  )}
                </div>

                {/* Features prefix */}
                {featuresPrefix && (
                  <p className="text-[11.5px] font-medium text-fg-3">{featuresPrefix}</p>
                )}

                {/* Features list */}
                <ul className="space-y-1.5 flex-1 min-h-0">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-xs text-foreground">
                      <Check className="h-3.5 w-3.5 text-success-700 mt-0.5 shrink-0" aria-hidden />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  type="button"
                  disabled={isCurrent || busyPlan === planId}
                  onClick={
                    !isCurrent && !p.contact ? () => startCheckout(planId) : undefined
                  }
                  className={cn(
                    'mt-auto w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-70',
                    isCurrent
                      ? 'cursor-not-allowed bg-muted text-fg-3'
                      : p.contact
                        ? 'border border-border-strong bg-card text-sage-700 hover:bg-muted hover:border-sage-500 dark:text-sage-300'
                        : p.highlight
                          ? 'bg-sage-500 text-white hover:bg-sage-600 active:bg-sage-700'
                          : 'border border-border-strong bg-card text-sage-700 hover:bg-muted hover:border-sage-500 dark:text-sage-300',
                  )}
                >
                  {isCurrent
                    ? t('billingCurrent')
                    : busyPlan === planId
                      ? '…'
                      : p.contact
                        ? tPricing('plans.enterprise.cta')
                        : tPricing(`plans.${pricingKey}.cta` as 'plans.pro.cta')}
                </button>

                {/* Checkout error (per-plan) */}
                {checkoutError?.plan === planId && (
                  <p className="text-center text-[11px] text-danger">{checkoutError.message}</p>
                )}

                {/* Footer note */}
                {!isCurrent && (
                  <p className="text-center text-[11px] text-fg-3">
                    {p.contact
                      ? tPricing('plans.enterprise.footerNote')
                      : tPricing(`plans.${pricingKey}.footerNote` as 'plans.pro.footerNote')}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Money-back guarantee ── */}
      <div className="rounded-lg border border-success-50 bg-success-50/40 p-4 flex items-start gap-3 dark:bg-success-500/5 dark:border-success-500/20">
        <Shield className="h-5 w-5 text-success-700 shrink-0 mt-0.5" aria-hidden />
        <div>
          <p className="text-sm font-medium text-success-700">{tBilling('moneyBack.title')}</p>
          <p className="text-xs text-fg-3 mt-0.5">{tBilling('moneyBack.subtitle')}</p>
        </div>
      </div>

      {/* ── Trial note ── */}
      <p className="text-center text-xs text-fg-3">{tBilling('trial.info')}</p>
    </div>
  );
}
