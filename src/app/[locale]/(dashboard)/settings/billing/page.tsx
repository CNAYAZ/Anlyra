'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Check, CheckCircle2, Coins, Crown, Info, Loader2, Shield } from 'lucide-react';
import { usePlan } from '@/lib/billing/context';
import { PLANS, CREDIT_PACKS, type PlanId, type CreditPack } from '@/lib/billing/plans';
import type { BillingState } from '@/lib/billing/context';
import { useCreditsStore } from '@/stores/credits-store';
import { useIsOwner } from '@/lib/auth/owner-context';
import { apiFetch } from '@/lib/api/fetcher';
import { COMPANY } from '@/lib/company';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatCurrency } from '@/lib/utils';
import { useAppLocale } from '@/hooks/use-locale';

const VISIBLE_PLANS: PlanId[] = ['PRO', 'ADVANCED', 'ENTERPRISE'];

/**
 * How long we're willing to wait for the webhook after a successful Stripe
 * checkout before telling the customer to just email us. Every 3s for 10
 * attempts = 30s total: long enough that a webhook running "a few seconds"
 * behind (the normal case) resolves well within it, short enough that
 * nobody is staring at a spinner for minutes if something is actually wrong.
 */
const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 10;

function BillingPageFallback() {
  return (
    <div className="space-y-6 max-w-5xl">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-80 w-full rounded-lg" />
    </div>
  );
}

/**
 * useSearchParams() requires a Suspense boundary around its caller (same
 * pattern already used by login/page.tsx, reset-password/page.tsx,
 * verify-email/page.tsx — not a new convention).
 */
export default function SettingsBillingPage() {
  return (
    <Suspense fallback={<BillingPageFallback />}>
      <SettingsBillingPageInner />
    </Suspense>
  );
}

function SettingsBillingPageInner() {
  const t = useTranslations('settings');
  const tBilling = useTranslations('billing');
  const tPricing = useTranslations('pricing');
  const aiCredits = useCreditsStore((s) => s.credits);
  const setCredits = useCreditsStore((s) => s.setCredits);
  const isOwner = useIsOwner();
  const locale = useAppLocale();
  const plan = usePlan();
  const currentPlanId = plan.plan;
  const currentCycle = plan.cycle;
  // A plan only counts as "current" when the organization has a REAL,
  // converted subscription — same definition trial-check.ts's PAID_STATUSES
  // uses for "this org has already converted to a paid plan": 'active' or
  // 'past_due'. An organization with NO BillingSubscription row at all gets a
  // SYNTHETIC status from defaultSubscription() (billing/repository.ts):
  // 'trialing' while the free trial clock is still running, 'canceled' once
  // it expires — and the synthetic plan is always "PRO" in both cases.
  // Without this guard, EVERY organization that has never paid anything sees
  // the Pro card marked "Piano attuale" and disabled the moment it lands on
  // this page with the monthly cycle selected (PRO/monthly is exactly what
  // the synthetic object reports) — the bug this fixes. defaultSubscription
  // can only ever produce 'trialing' or 'canceled' (verified: those are its
  // only two return values), so checking the status alone is enough to tell
  // a real row from the synthetic one — no extra flag needed.
  const hasRealSubscription = plan.status === 'active' || plan.status === 'past_due';

  // ── Return from Stripe checkout ──────────────────────────────────────────
  // checkout/route.ts and credits/checkout/route.ts build these three exact
  // redirect targets (success_url/cancel_url): /settings/billing?success=1,
  // ?credits=1, ?canceled=1. Nothing read them before this — the customer
  // landed back here with no acknowledgement that anything had happened.
  const searchParams = useSearchParams();
  const returnCase: 'success' | 'credits' | 'canceled' | null =
    searchParams.get('success') === '1'
      ? 'success'
      : searchParams.get('credits') === '1'
        ? 'credits'
        : searchParams.get('canceled') === '1'
          ? 'canceled'
          : null;

  // Overrides plan.status once a re-poll (below) sees the subscription go
  // active. plan.status itself never changes on its own — it is fixed at the
  // moment the server rendered this page (BillingProvider's initialState) —
  // so without this override the confirmation could never appear without a
  // manual reload, which is the exact problem this file exists to fix.
  const [polledStatus, setPolledStatus] = useState<BillingState['status'] | null>(null);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const effectiveStatus = polledStatus ?? plan.status;
  const subscriptionConfirmed = effectiveStatus === 'active' || effectiveStatus === 'past_due';

  // Re-check the subscription every few seconds — ONLY when we just came back
  // from a successful subscription checkout AND it is not already active
  // (test a: already active → this guard exits immediately, no interval is
  // ever created). Never runs on an ordinary visit to this page (returnCase
  // is null whenever the URL carries none of the three params), and never
  // for the credits or canceled cases (buying a credit pack or backing out
  // of checkout does not change trial/subscription status, so there is
  // nothing here worth polling for).
  useEffect(() => {
    if (returnCase !== 'success') return;
    if (plan.status === 'active' || plan.status === 'past_due') return;

    let attempts = 0;
    const id = setInterval(() => {
      attempts += 1;
      apiFetch<BillingState>('/api/billing/status')
        .then((state) => {
          if (state.status === 'active' || state.status === 'past_due') {
            setPolledStatus(state.status);
            clearInterval(id);
          } else if (attempts >= POLL_MAX_ATTEMPTS) {
            setPollTimedOut(true);
            clearInterval(id);
          }
        })
        .catch(() => {
          // Transient network hiccup — try again on the next tick rather than
          // giving up on the first failure; the attempt still counts toward
          // the cap below so a persistently broken connection still stops.
          if (attempts >= POLL_MAX_ATTEMPTS) {
            setPollTimedOut(true);
            clearInterval(id);
          }
        });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(id);
    // plan.status is read only to decide whether to START polling at all,
    // and (see the comment above the state declarations) never changes on
    // its own during this component's life — including it here is correct
    // per the hook's own rules without causing the interval to be torn down
    // and recreated on every render.
  }, [returnCase, plan.status]);

  // Same mechanism as the subscription poll above (same interval, same
  // attempt cap, same "give up after 30s" behaviour), extended to the
  // credits case — which was previously left out on purpose (see the
  // comment on the effect above: "never for the credits ... case"), leaving
  // a stale counter on screen until the customer reloaded by hand.
  //
  // WHAT TO COMPARE, verified before writing this: a subscription has a
  // binary state to wait for (active/past_due vs not), available instantly
  // from BillingProvider's SSR-provided initialState — so the subscription
  // effect can decide "already done, never poll" from a value it already
  // has, with no extra read. A credit balance has no such binary "done"
  // state: any non-negative integer is valid, so "already updated" cannot
  // be told apart from "not yet updated" by looking at the number alone —
  // only a RISE in the number, observed during this visit, proves the
  // webhook landed (applyCreditPurchase, src/lib/billing/repository.ts,
  // only ever increments the balance, never leaves it flat or lowers it).
  //
  // Consequence, verified by testing (see the report for this commit): a
  // subscription checkout that is already active on arrival skips polling
  // entirely, because that fact is known up front. A credits checkout that
  // already reflects the purchase on arrival CANNOT be told apart, up
  // front, from one that has not landed yet — both look like "some number,"
  // not "the right number" — so the poll still runs in the background for
  // up to 30s before giving up quietly. The number on screen is correct
  // from the first render either way (it always shows the true server
  // value); what the poll adds is catching a LATE-arriving rise without a
  // reload, and it never shows anything alarming if nothing was actually
  // wrong.
  //
  // The baseline is the balance THIS VISIT first saw, captured once. It is
  // deliberately NOT read on the very first render: aiCredits starts at the
  // store's default (0) for one tick before CreditsHydrator's own effect
  // (a sibling component, src/components/dashboard/CreditsHydrator.tsx)
  // hydrates it from the server — locking in that transient 0 as "the
  // balance before this purchase" would make ANY real balance look like an
  // increase and confirm falsely on every visit, purchase or not.
  const [creditsConfirmed, setCreditsConfirmed] = useState(false);
  const [creditsPollTimedOut, setCreditsPollTimedOut] = useState(false);
  const creditsBaselineRef = useRef<number | null>(null);

  useEffect(() => {
    if (returnCase !== 'credits') return;
    if (creditsConfirmed || creditsPollTimedOut) return;
    if (aiCredits === 0 && creditsBaselineRef.current === null) return;
    if (creditsBaselineRef.current === null) {
      creditsBaselineRef.current = aiCredits;
    }
    const baseline = creditsBaselineRef.current;

    let attempts = 0;
    const id = setInterval(() => {
      attempts += 1;
      apiFetch<{ credits: number }>('/api/billing/credits')
        .then((data) => {
          if (data.credits > baseline) {
            setCredits(data.credits);
            setCreditsConfirmed(true);
            clearInterval(id);
          } else if (attempts >= POLL_MAX_ATTEMPTS) {
            setCreditsPollTimedOut(true);
            clearInterval(id);
          }
        })
        .catch(() => {
          // Transient network hiccup — try again on the next tick, same
          // reasoning as the subscription poll's catch above.
          if (attempts >= POLL_MAX_ATTEMPTS) {
            setCreditsPollTimedOut(true);
            clearInterval(id);
          }
        });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(id);
    // aiCredits is a dependency so the effect re-evaluates once the transient
    // 0 above resolves to a real value — the creditsConfirmed/timedOut guards
    // stop it from ever creating a second interval once one of those becomes
    // true (the only other things that change aiCredits during this effect's
    // life are this same effect's own setCredits call on confirmation).
  }, [returnCase, aiCredits, creditsConfirmed, creditsPollTimedOut, setCredits]);

  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [busyPlan, setBusyPlan] = useState<PlanId | null>(null);
  const [checkoutError, setCheckoutError] = useState<{ plan: PlanId; message: string } | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [busyPack, setBusyPack] = useState<CreditPack['id'] | null>(null);
  const [packError, setPackError] = useState<{ pack: CreditPack['id']; message: string } | null>(null);

  // Same flow as components/billing/CurrentPlanCard.openPortal: POST the portal
  // session, redirect to the returned Stripe URL. The org's stripeCustomerId is
  // not exposed client-side, so we always render the button and translate the
  // route's 400 ("No Stripe customer") into a clean "no active subscription"
  // message instead of hiding it.
  async function openPortal() {
    setPortalBusy(true);
    setPortalError(null);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const json = (await res.json()) as { success: boolean; data?: { url: string }; error?: string };
      if (json.success && json.data?.url) {
        window.location.href = json.data.url;
        return;
      }
      setPortalError(res.status === 400 ? tBilling('managePortalNoSub') : tBilling('managePortalError'));
    } catch {
      setPortalError(tBilling('managePortalError'));
    } finally {
      setPortalBusy(false);
    }
  }

  // Same flow as startCheckout below, for a one-time credit pack instead of a
  // recurring plan: POST /api/billing/credits/checkout, redirect to Stripe.
  //
  // Error mapping: the route can answer PRICE_NOT_CONFIGURED (500 — the
  // pack's STRIPE_PRICE_CREDITS_* env var is missing) or "Unknown credit
  // pack" (400 — a tampered packId). Neither is something a customer should
  // ever read verbatim, so both map to one honest, actionable message
  // instead of the raw string; anything else (network failure, an
  // unrecognized error) falls back to the same generic message.
  async function startCreditsCheckout(packId: CreditPack['id']) {
    setBusyPack(packId);
    setPackError(null);
    try {
      const res = await fetch('/api/billing/credits/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId }),
      });
      const json = (await res.json()) as { success: boolean; data?: { url: string }; error?: string };
      if (json.success && json.data?.url) {
        window.location.href = json.data.url;
        return;
      }
      const friendly =
        json.error === 'PRICE_NOT_CONFIGURED' || json.error === 'Unknown credit pack'
          ? tBilling('credits.buyErrorConfig')
          : tBilling('credits.buyErrorGeneric');
      setPackError({ pack: packId, message: friendly });
      setBusyPack(null);
    } catch {
      setPackError({ pack: packId, message: tBilling('credits.buyErrorGeneric') });
      setBusyPack(null);
    }
  }

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
        // PAYMENT_PROVIDER_UNAVAILABLE and PRICE_NOT_CONFIGURED
        // (checkout/route.ts) are stable codes, not human text — map both to
        // the same honest message that says nothing about why (missing
        // Stripe key vs. Stripe being down vs. a missing price env var)
        // instead of showing the code itself. Every other error string the
        // route can produce is shown as-is, unchanged from before.
        const message =
          json.error === 'PAYMENT_PROVIDER_UNAVAILABLE' || json.error === 'PRICE_NOT_CONFIGURED'
            ? tBilling('checkoutErrorProvider')
            : (json.error ?? 'Checkout failed');
        setCheckoutError({ plan: planId, message });
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

      {/* ── Return from Stripe checkout ──
          Same visual language already used elsewhere on this page (the
          success/money-back box below) and in the dashboard's other page-level
          strips (DemoBanner, TrialExpiredBanner): a bordered, tinted box with
          an icon and role="status", not a new look. */}
      {returnCase === 'canceled' && (
        <div role="status" className="flex items-center gap-3 rounded-lg border border-border bg-muted/60 px-4 py-3 text-sm text-foreground">
          <Info className="h-4 w-4 shrink-0 text-fg-3" aria-hidden />
          <span>{tBilling('checkoutReturn.canceled')}</span>
        </div>
      )}
      {returnCase === 'credits' && (
        <div role="status" className="flex items-start gap-3 rounded-lg border border-success-50 bg-success-50/40 px-4 py-3 text-sm text-success-700 dark:bg-success-500/5 dark:border-success-500/20">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
          <div>
            <p>{tBilling('checkoutReturn.credits')}</p>
            {/* The purchase succeeded either way (Stripe already told us so
                by sending the customer back here) — this note is about the
                COUNTER possibly lagging, not the payment, so it stays calm
                and factual instead of looking like a second, worse message
                stacked under the first. */}
            {creditsPollTimedOut && !creditsConfirmed && (
              <p className="mt-1 text-xs text-success-700/80 dark:text-success-500/70">
                {tBilling('checkoutReturn.creditsBalancePending')}
              </p>
            )}
          </div>
        </div>
      )}
      {returnCase === 'success' && (
        subscriptionConfirmed ? (
          <div role="status" className="flex items-center gap-3 rounded-lg border border-success-50 bg-success-50/40 px-4 py-3 text-sm text-success-700 dark:bg-success-500/5 dark:border-success-500/20">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
            <span>{tBilling('checkoutReturn.subscriptionActive')}</span>
          </div>
        ) : pollTimedOut ? (
          <div role="status" className="flex items-center gap-3 rounded-lg border border-primary-accent/30 bg-primary-accent/10 px-4 py-3 text-sm text-foreground">
            <Info className="h-4 w-4 shrink-0 text-primary-accent" aria-hidden />
            <span>{tBilling('checkoutReturn.subscriptionTimeout', { email: COMPANY.contactEmail })}</span>
          </div>
        ) : (
          <div role="status" className="flex items-center gap-3 rounded-lg border border-primary-accent/30 bg-primary-accent/10 px-4 py-3 text-sm text-foreground">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary-accent" aria-hidden />
            <span>{tBilling('checkoutReturn.subscriptionPending')}</span>
          </div>
        )
      )}

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
        {/* Manage subscription → Stripe Customer Portal. Owner-only: the portal
            can cancel the subscription or change plan, and the route itself
            now refuses anyone but 'owner' (requireOwnerRole) — disabled here
            too, with an explanation, so a non-owner isn't offered a button
            that would only fail after the click. */}
        <button
          type="button"
          onClick={openPortal}
          disabled={portalBusy || !isOwner}
          title={!isOwner ? tBilling('ownerOnly') : undefined}
          className="shrink-0 rounded-lg border border-border-strong bg-card px-3 py-2 text-sm font-medium text-sage-700 transition-colors hover:bg-muted hover:border-sage-500 disabled:opacity-70 dark:text-sage-300"
        >
          {portalBusy ? '…' : tBilling('currentPlanCard.manageBtn')}
        </button>
        {portalError && <p className="w-full text-[11px] text-danger">{portalError}</p>}
        {!isOwner && <p className="w-full text-[11px] text-fg-3">{tBilling('ownerOnly')}</p>}
      </div>

      {/* ── Credit packs: one-time top-up, separate from the recurring plan.
          POST /api/billing/credits/checkout existed and worked (Stripe
          session + webhook crediting aiCreditsPurchased) but nothing in the
          product called it — this is the missing button. Owner-only, same
          guard and same UI precedent as the portal/plan buttons above
          (requireOwnerRole server-side, isOwner + tBilling('ownerOnly')
          here). */}
      <div>
        <h2 className="font-heading text-lg font-semibold text-foreground mb-1">
          {tBilling('credits.title')}
        </h2>
        <p className="text-xs text-fg-3 mb-4">{tBilling('credits.explainer')}</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {CREDIT_PACKS.map((pack) => (
            <div
              key={pack.id}
              className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3 shadow-elev-1"
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-sage-50 text-sage-600 dark:bg-sage-700/30 dark:text-sage-300">
                <Coins className="h-4 w-4" />
              </span>
              <div>
                <p className="font-heading text-xl font-semibold text-foreground tabular-nums">
                  {pack.credits} {tBilling('credits.credits')}
                </p>
                <p className="text-sm text-fg-3 tabular-nums">
                  {formatCurrency(pack.priceCents / 100, locale)}
                </p>
              </div>
              <button
                type="button"
                disabled={busyPack === pack.id || !isOwner}
                title={!isOwner ? tBilling('ownerOnly') : undefined}
                onClick={isOwner ? () => startCreditsCheckout(pack.id) : undefined}
                className="mt-auto w-full rounded-lg border border-border-strong bg-card px-3 py-2 text-sm font-medium text-sage-700 transition-colors hover:bg-muted hover:border-sage-500 disabled:opacity-70 dark:text-sage-300"
              >
                {busyPack === pack.id ? '…' : tBilling('credits.buyPack')}
              </button>
              {packError?.pack === pack.id && (
                <p className="text-center text-[11px] text-danger">{packError.message}</p>
              )}
            </div>
          ))}
        </div>
        {!isOwner && <p className="mt-2 text-[11px] text-fg-3">{tBilling('ownerOnly')}</p>}
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
            // "Current" only when the plan AND the selected billing cycle match
            // the user's real subscription. ENTERPRISE is a contact plan with no
            // cycle, so it stays current on plan match alone. This lets a monthly
            // subscriber switch to the same plan's yearly price (and vice versa).
            const isCurrent = hasRealSubscription && planId === currentPlanId && (p.contact || cycle === currentCycle);
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
                  {p.contact ? (
                    <p className="text-xs text-fg-3 mt-0.5">
                      {tPricing('plans.enterprise.taglineSub')}
                    </p>
                  ) : (
                    <p className="text-xs text-fg-3 mt-0.5">{tPricing('vatNote')}</p>
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

                {/* CTA. Owner-only for a real checkout (not the Enterprise
                    "contact us" button, which never calls startCheckout):
                    /api/billing/checkout now refuses anyone but 'owner'
                    (requireOwnerRole), so a non-owner is stopped here too,
                    with a tooltip, instead of clicking through to a 403. */}
                <button
                  type="button"
                  disabled={isCurrent || busyPlan === planId || (!p.contact && !isOwner)}
                  title={!isCurrent && !p.contact && !isOwner ? tBilling('ownerOnly') : undefined}
                  onClick={
                    !isCurrent && !p.contact && isOwner ? () => startCheckout(planId) : undefined
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
