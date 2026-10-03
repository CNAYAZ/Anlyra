'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Info, Loader2 } from 'lucide-react';
import type { PlanId } from '@/lib/billing/plans';

type Offer = {
  trialOffered: boolean;
  blockedBy: 'company' | 'vat' | 'card' | null;
  ruleText: string;
  amountCents: number;
  trialDays: number;
  trialCredits: number;
};

/**
 * The step BEFORE the card (founder's decisions, 2026-10-03):
 *  • says whether the 7-day trial is offered — and, when the VAT number or the
 *    company has already had one, says so here, before any payment, with the
 *    choice of paying at once or giving up;
 *  • shows the box with the rule and the exact amount of the chosen plan. The
 *    sentence comes from the server (/api/billing/trial-offer), from the same
 *    function that records it when the box is ticked, so what is recorded is
 *    what was shown here.
 */
export function TrialCheckoutConfirm({
  plan,
  cycle,
  onCancel,
}: {
  plan: PlanId;
  cycle: 'monthly' | 'yearly';
  onCancel: () => void;
}) {
  const t = useTranslations('billing.trialCheckout');
  const tBilling = useTranslations('billing');
  const locale = useLocale() === 'en' ? 'en' : 'it';
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ticked, setTicked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    fetch(`/api/billing/trial-offer?plan=${plan}&cycle=${cycle}&locale=${locale}`)
      .then((r) => r.json())
      .then((j: { success: boolean; data?: Offer; error?: string }) => {
        if (!alive) return;
        if (j.success && j.data) setOffer(j.data);
        else
          setLoadError(
            j.error === 'BILLING_DETAILS_INCOMPLETE' ? tBilling('details.requiredForCheckout') : tBilling('checkoutErrorProvider'),
          );
      })
      .catch(() => alive && setLoadError(tBilling('checkoutErrorNetwork')));
    return () => {
      alive = false;
    };
  }, [plan, cycle, locale, reload, tBilling]);

  async function goToCard() {
    if (!offer) return;
    if (!ticked) {
      setError(t('mustTick'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, cycle, acceptTrialRule: true, trialOffered: offer.trialOffered, locale }),
      });
      const json = (await res.json()) as { success: boolean; data?: { url: string }; error?: string };
      if (json.success && json.data?.url) {
        window.location.href = json.data.url;
        return;
      }
      if (json.error === 'TRIAL_OFFER_CHANGED') {
        // The text the customer ticked no longer applies: show the new one.
        setTicked(false);
        setOffer(null);
        setReload((n) => n + 1);
        setError(t('offerChanged'));
      } else if (json.error === 'TRIAL_RULE_NOT_RECORDED') {
        setError(t('notRecorded'));
      } else if (json.error === 'BILLING_DETAILS_INCOMPLETE') {
        setError(tBilling('details.requiredForCheckout'));
      } else {
        setError(tBilling('checkoutErrorProvider'));
      }
    } catch {
      setError(tBilling('checkoutErrorNetwork'));
    }
    setBusy(false);
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-5 shadow-elev-1" data-testid="trial-checkout-confirm">
      <h3 className="font-heading text-base font-semibold text-foreground">{t('title')}</h3>

      {loadError ? (
        <p className="text-sm text-danger">{loadError}</p>
      ) : !offer ? (
        <p className="flex items-center gap-2 text-sm text-fg-3">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {t('loading')}
        </p>
      ) : (
        <>
          {offer.trialOffered ? (
            <p className="text-sm text-fg-2 tabular-nums">
              {t('trialIntro', { days: offer.trialDays, credits: offer.trialCredits })}
            </p>
          ) : (
            <div role="status" className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{offer.blockedBy === 'company' ? t('companyUsed') : t('vatUsed')}</span>
            </div>
          )}

          <label className="flex items-start gap-3 text-sm text-foreground">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 shrink-0"
              checked={ticked}
              onChange={(e) => {
                setTicked(e.target.checked);
                setError(null);
              }}
            />
            <span className="tabular-nums" data-testid="trial-rule-text">{offer.ruleText}</span>
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={goToCard}
              disabled={busy}
              className="rounded-lg bg-sage-500 px-4 py-2 text-sm font-medium text-white hover:bg-sage-600 disabled:opacity-70"
            >
              {busy ? '…' : offer.trialOffered ? t('continueTrial') : t('continuePay')}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="rounded-lg border border-border-strong bg-card px-4 py-2 text-sm font-medium text-fg-2 hover:bg-muted"
            >
              {t('giveUp')}
            </button>
          </div>
        </>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
