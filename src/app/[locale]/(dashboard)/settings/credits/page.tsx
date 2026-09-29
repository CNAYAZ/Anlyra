'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Coins, Sparkles } from 'lucide-react';
import { usePlan } from '@/lib/billing/context';
import { CREDIT_PACKS, type CreditPack } from '@/lib/billing/plans';
import type { CreditHistoryResponse } from '@/types/billing';
import { useCreditsStore } from '@/stores/credits-store';
import { useIsOwner } from '@/lib/auth/owner-context';
import { apiFetch } from '@/lib/api/fetcher';
import { Link } from '@/i18n/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { useBillingDetails } from '@/components/billing/BillingDetailsForm';
import { CheckoutReturnNotice } from '@/components/billing/CheckoutReturnNotice';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { useAppLocale } from '@/hooks/use-locale';

/** Rows per page for the credit history table — mirrors the API's own default. */
const CREDIT_HISTORY_PAGE_SIZE = 20;

function PageFallback() {
  return (
    <div className="space-y-6 max-w-5xl">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-80 w-full rounded-lg" />
    </div>
  );
}

/**
 * Settings → Crediti: balance, packs, history. One of the three pages the old
 * settings/billing page was split into (founder's decision); the credits
 * counter in the top bar and every "credits exhausted" message link here, and
 * the return from a credit-pack checkout lands here.
 */
export default function SettingsCreditsPage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <SettingsCreditsPageInner />
    </Suspense>
  );
}

function SettingsCreditsPageInner() {
  const tBilling = useTranslations('billing');
  const tCommon = useTranslations('common');
  const aiCredits = useCreditsStore((s) => s.credits);
  const isOwner = useIsOwner();
  const locale = useAppLocale();
  const plan = usePlan();
  // Same criterion the server uses to gate the credit-pack checkout route
  // (requireActiveAccess, billing/server-gate.ts) and to gate spending
  // credits in the first place: a purchased pack sits unusable until the
  // subscription is 'active' or 'trialing' again, so the button is disabled
  // before the click instead of failing only after Stripe redirects back.
  const canBuyCredits = plan.status === 'active' || plan.status === 'trialing';
  // Founder's decision: no payment before the owner has entered the invoicing
  // data. The checkout route refuses too (BILLING_DETAILS_INCOMPLETE); the
  // buttons are disabled here so nobody clicks into that refusal.
  const { data: billingDetails } = useBillingDetails();
  const billingComplete = billingDetails?.complete === true;

  const [busyPack, setBusyPack] = useState<CreditPack['id'] | null>(null);
  const [packError, setPackError] = useState<{ pack: CreditPack['id']; message: string } | null>(null);

  // ── Credit ledger (Storico) ──────────────────────────────────────────────
  // useQuery, not a hand-rolled useEffect+useState: same tool the rest of the
  // app already uses for exactly this shape (fetch, paginated, page in the
  // key) — see ai/insights/page.tsx's identical queryKey-includes-page
  // pattern. Not tied to `aiCredits` or any other balance signal: a fresh
  // purchase/consumption shows up next time the customer turns a page or
  // reloads, same staleness the rest of this page already accepts for
  // everything that isn't the balance counter itself.
  const [historyPage, setHistoryPage] = useState(1);
  const {
    data: history,
    isLoading: historyLoading,
    isError: historyError,
  } = useQuery({
    queryKey: ['credit-history', historyPage],
    queryFn: () =>
      apiFetch<CreditHistoryResponse>(
        `/api/billing/credits/history?page=${historyPage}&pageSize=${CREDIT_HISTORY_PAGE_SIZE}`,
      ),
  });

  // Same flow as startCheckout below, for a one-time credit pack instead of a
  // recurring plan: POST /api/billing/credits/checkout, redirect to Stripe.
  //
  // Error mapping: the route can answer PRICE_NOT_CONFIGURED (500 — the
  // pack's STRIPE_PRICE_CREDITS_* env var is missing), "Unknown credit
  // pack" (400 — a tampered packId), or SUBSCRIPTION_NOT_ACTIVE (403 — the
  // button below is disabled for this case, but the plan can lapse between
  // render and click). None of these is something a customer should ever
  // read verbatim, so each maps to one honest, actionable message instead of
  // the raw string; anything else (network failure, an unrecognized error)
  // falls back to the same generic message.
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
          : json.error === 'SUBSCRIPTION_NOT_ACTIVE'
            ? tBilling('credits.buySubscriptionInactive')
            : json.error === 'BILLING_DETAILS_INCOMPLETE'
              ? tBilling('details.requiredForCheckout')
              : tBilling('credits.buyErrorGeneric');
      setPackError({ pack: packId, message: friendly });
      setBusyPack(null);
    } catch {
      setPackError({ pack: packId, message: tBilling('credits.buyErrorGeneric') });
      setBusyPack(null);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">{tBilling('pages.credits.title')}</h1>
        <p className="text-sm text-fg-2 mt-0.5">{tBilling('pages.credits.subtitle')}</p>
      </div>

      <CheckoutReturnNotice scope="credits" />

      {/* ── Balance: what the counter in the top bar shows (plan + purchased). ── */}
      <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-4 shadow-elev-1">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-sage-50 text-sage-600 dark:bg-sage-700/30 dark:text-sage-300 shrink-0">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-fg-3">{tBilling('pages.credits.balance')}</p>
          <p className="font-heading text-2xl font-semibold tabular-nums text-foreground">{aiCredits}</p>
        </div>
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
                disabled={busyPack === pack.id || !isOwner || !canBuyCredits || !billingComplete}
                title={
                  !isOwner
                    ? tBilling('ownerOnly')
                    : !canBuyCredits
                      ? tBilling('credits.buySubscriptionInactive')
                      : !billingComplete
                        ? tBilling('details.requiredForCheckout')
                        : undefined
                }
                onClick={isOwner && canBuyCredits && billingComplete ? () => startCreditsCheckout(pack.id) : undefined}
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
        {isOwner && !canBuyCredits && (
          <p className="mt-2 text-[11px] text-fg-3">{tBilling('credits.buySubscriptionInactive')}</p>
        )}
        {isOwner && canBuyCredits && !billingComplete && (
          <p className="mt-2 text-[11px] text-fg-3">
            {tBilling('details.requiredForCheckout')}{' '}
            <Link href="/settings/billing-details" className="font-medium text-sage-700 underline dark:text-sage-300">
              {tBilling('details.goToDetails')}
            </Link>
          </p>
        )}
      </div>

      {/* ── Credit history (Storico): every ledger movement, paginated, newest
          first. Open to every member — same tier as the balance itself, no
          isOwner gate here (see api/billing/credits/history/route.ts for why).
          historyLegacyNotice is NOT tied to whether this page happens to have
          rows: `incomplete` compares the WHOLE ledger's sum against the real
          balance server-side, so it is correct on every page, including an
          empty one. */}
      <div>
        <h2 className="font-heading text-lg font-semibold text-foreground mb-1">
          {tBilling('credits.history')}
        </h2>
        {history?.incomplete && (
          <p className="mb-3 text-xs text-fg-3">{tBilling('credits.historyLegacyNotice')}</p>
        )}
        {historyLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ) : historyError ? (
          <p className="rounded-lg border border-border bg-card p-4 text-sm text-danger">
            {tBilling('credits.historyError')}
          </p>
        ) : !history || history.entries.length === 0 ? (
          // "A message, not an empty table" — a table with a header row and
          // nothing under it reads as broken; this reads as "nothing has
          // happened yet", which is the actual state for a brand-new org.
          <p className="rounded-lg border border-border bg-card p-4 text-sm text-fg-3">
            {tBilling('credits.historyEmpty')}
          </p>
        ) : (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-lg border border-border bg-card shadow-elev-1">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left">{tCommon('date')}</th>
                      <th className="px-4 py-3 text-left">{tBilling('credits.historyReasonHeader')}</th>
                      <th className="px-4 py-3 text-right">{tBilling('credits.historyChangeHeader')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.entries.map((entry) => {
                      const positive = entry.delta > 0;
                      return (
                        <tr key={entry.id} className="border-t border-border">
                          <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                            {formatDate(entry.createdAt, locale)}
                          </td>
                          <td className="px-4 py-3">
                            {tBilling(`credits.reasons.${entry.reason}`)}
                          </td>
                          <td
                            className={cn(
                              'px-4 py-3 text-right font-medium tabular-nums',
                              positive ? 'text-success' : 'text-danger',
                            )}
                          >
                            {positive ? '+' : ''}
                            {entry.delta}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <Pagination
              page={history.pagination.page}
              pageSize={history.pagination.pageSize}
              total={history.pagination.total}
              totalPages={history.pagination.totalPages}
              onPageChange={setHistoryPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
