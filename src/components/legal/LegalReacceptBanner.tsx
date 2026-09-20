'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';
import { Link } from '@/i18n/navigation';

/**
 * Strip shown when the signed-in user's User.termsAcceptedVersion does not
 * match CURRENT_LEGAL_VERSION (@/lib/legal/version) — an out-of-date
 * acceptance, or none on record at all (every pre-existing account today).
 *
 * NON-BLOCKING, DELIBERATELY: same shape and same choice as TrialExpiredBanner
 * and DemoBanner — a strip that pushes content down, never an overlay. See the
 * session report for why a blocking gate was rejected: the one case this MUST
 * NOT do is lock out an existing account that has never seen this checkbox,
 * and a full-screen gate risks exactly that (a redirect loop, a route the
 * gate forgot to allow through, …) for a great many accounts on day one. A
 * strip cannot lock anyone out of anything — worst case, someone ignores it.
 *
 * `needsReaccept` is computed server-side (dashboard layout, from a real DB
 * read) and passed in as a prop rather than fetched again here: there is
 * exactly one place in the tree that needs this value, so a shared client
 * context (the pattern DemoProvider/OwnerProvider use for values read in
 * several places) would be one more moving part for no second consumer.
 */
export function LegalReacceptBanner({ needsReaccept }: { needsReaccept: boolean }) {
  const t = useTranslations('legal.reaccept');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(false);
  // Hidden the moment the request SUCCEEDS, ahead of router.refresh()
  // finishing: the banner disappearing is the confirmation, the refresh
  // behind it is what makes that true from the server's own data on the very
  // next render, not just locally.
  const [dismissedLocally, setDismissedLocally] = useState(false);

  if (!needsReaccept || dismissedLocally) return null;

  function handleAccept() {
    setError(false);
    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/accept-terms', { method: 'POST' });
        if (!res.ok) {
          setError(true);
          return;
        }
        setDismissedLocally(true);
        router.refresh();
      } catch {
        setError(true);
      }
    });
  }

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-warning-500/30 bg-warning-50 px-4 py-2.5 text-sm text-warning-700 dark:bg-warning-500/10 dark:text-warning-50 sm:px-6"
    >
      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-[200px] flex-1">
        {t('message')}{' '}
        <Link href="/legal/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
          {t('privacyLink')}
        </Link>{' '}
        <Link href="/legal/terms" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
          {t('termsLink')}
        </Link>
        {error && <span className="ml-2 text-danger">{t('error')}</span>}
      </span>
      <button
        type="button"
        onClick={handleAccept}
        disabled={isPending}
        className="inline-flex shrink-0 items-center rounded-lg bg-sage-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-sage-600 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 focus-visible:ring-offset-2"
      >
        {isPending ? t('accepting') : t('accept')}
      </button>
    </div>
  );
}
