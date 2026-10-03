'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { CheckCircle2, Info, Loader2 } from 'lucide-react';
import { usePlan, type BillingState } from '@/lib/billing/context';
import { useCreditsStore } from '@/stores/credits-store';
import { apiFetch } from '@/lib/api/fetcher';
import { COMPANY } from '@/lib/company';
import { APP_TIME_ZONE } from '@/lib/timezone';
import { TRIAL_CREDITS } from '@/lib/billing/trial-constants';


type CheckoutReturn = {
  subscription: boolean;
  status: BillingState['status'];
  periodEnd: string | null;
  trialDenied: string | null;
  trialRecorded: boolean;
};
type CheckoutOutcome =
  | { kind: 'trialStarted'; until: string | null }
  | { kind: 'trialDenied'; reason: string }
  | { kind: 'paid' };

/**
 * How long we're willing to wait for the webhook after a successful Stripe
 * checkout before telling the customer to just email us. Every 3s for 10
 * attempts = 30s total: long enough that a webhook running "a few seconds"
 * behind (the normal case) resolves well within it, short enough that
 * nobody is staring at a spinner for minutes if something is actually wrong.
 */
const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 10;

/**
 * The acknowledgement shown when the customer comes back from Stripe, with the
 * re-check that waits for the webhook. Moved as it was out of the old single
 * billing page when it was split into Abbonamento / Crediti / Dati di
 * fatturazione: each page renders it for ITS OWN return only, so the
 * subscription poll runs only on the Abbonamento page (?success=1) and the
 * balance poll only on the Crediti page (?credits=1). ?canceled=1 is shown on
 * either — both checkouts send it (see settings/billing/page.tsx, which now
 * only redirects).
 */
export function CheckoutReturnNotice({ scope }: { scope: 'subscription' | 'credits' }) {
  const tBilling = useTranslations('billing');
  const locale = useLocale();
  const aiCredits = useCreditsStore((s) => s.credits);
  const setCredits = useCreditsStore((s) => s.setCredits);
  const plan = usePlan();

  // ── Return from Stripe checkout ──────────────────────────────────────────
  // checkout/route.ts and credits/checkout/route.ts build these three exact
  // redirect targets (success_url/cancel_url): /settings/billing?success=1,
  // ?credits=1, ?canceled=1. Nothing read them before this — the customer
  // landed back here with no acknowledgement that anything had happened.
  const searchParams = useSearchParams();
  const rawCase: 'success' | 'credits' | 'canceled' | null =
    searchParams.get('success') === '1'
      ? 'success'
      : searchParams.get('credits') === '1'
        ? 'credits'
        : searchParams.get('canceled') === '1'
          ? 'canceled'
          : null;
  const returnCase =
    rawCase === 'canceled' ||
    (rawCase === 'success' && scope === 'subscription') ||
    (rawCase === 'credits' && scope === 'credits')
      ? rawCase
      : null;


  // Overrides plan.status once a re-poll (below) sees the subscription go
  // active. plan.status itself never changes on its own — it is fixed at the
  // moment the server rendered this page (BillingProvider's initialState) —
  // so without this override the confirmation could never appear without a
  // manual reload, which is the exact problem this file exists to fix.
  const [polledStatus, setPolledStatus] = useState<BillingState['status'] | null>(null);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  // What the checkout ended in, once the webhook has landed (/api/billing/checkout-return):
  // a trial that started, a trial denied with an immediate charge (the card or
  // the VAT number had already had one), or a subscription paid at once.
  const [outcome, setOutcome] = useState<CheckoutOutcome | null>(null);
  const effectiveStatus = polledStatus ?? plan.status;
  const subscriptionConfirmed = outcome !== null || effectiveStatus === 'active' || effectiveStatus === 'past_due';

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

    let attempts = 0;
    const id = setInterval(() => {
      attempts += 1;
      apiFetch<CheckoutReturn>('/api/billing/checkout-return')
        .then((r) => {
          // Settled when a Stripe subscription is recorded AND, for one in
          // trial, the card check has run (trial recorded, or denied).
          const settled = r.subscription && (r.status !== 'trialing' || r.trialRecorded || r.trialDenied !== null);
          if (settled) {
            setPolledStatus(r.status);
            setOutcome(
              r.trialDenied
                ? { kind: 'trialDenied', reason: r.trialDenied }
                : r.status === 'trialing'
                  ? { kind: 'trialStarted', until: r.periodEnd }
                  : { kind: 'paid' },
            );
            // The trial credits (or none) are on the balance now: refresh the counter.
            apiFetch<{ credits: number }>('/api/billing/credits')
              .then((c) => setCredits(c.credits))
              .catch(() => {});
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
    // Runs once per return from Stripe: it no longer stops at a status that
    // is already "active" on arrival, because the notice now says WHAT the
    // checkout ended in (trial, trial denied, paid), which only this read knows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returnCase]);

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

  return (
    <>
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
      outcome?.kind === 'trialDenied' ? (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground">
          <Info className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
          <span>{tBilling(outcome.reason === 'card' ? 'checkoutReturn.trialDeniedCard' : 'checkoutReturn.trialDeniedVat')}</span>
        </div>
      ) : subscriptionConfirmed ? (
        <div role="status" className="flex items-center gap-3 rounded-lg border border-success-50 bg-success-50/40 px-4 py-3 text-sm text-success-700 dark:bg-success-500/5 dark:border-success-500/20">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
          <span className="tabular-nums">
            {outcome?.kind === 'trialStarted'
              ? tBilling('checkoutReturn.trialStarted', {
                  date: outcome.until ? new Date(outcome.until).toLocaleDateString(locale === 'en' ? 'en-GB' : 'it-IT', { timeZone: APP_TIME_ZONE }) : '—',
                  credits: TRIAL_CREDITS,
                })
              : tBilling('checkoutReturn.subscriptionActive')}
          </span>
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
    </>
  );
}
