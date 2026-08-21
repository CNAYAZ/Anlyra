'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { Cookie } from 'lucide-react';

const STORAGE_KEY = 'pro:cookie-consent';

type Consent = {
  acknowledgedAt: string;
};

function readConsent(): Consent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Consent) : null;
  } catch {
    return null;
  }
}

function writeConsent(c: Consent) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
}

/**
 * Anlyra only sets strictly-necessary technical cookies (session, org
 * selection, locale/theme preference — see the Cookie Policy table) and
 * Vercel Web Analytics, which is cookieless by design. There is nothing to
 * opt in or out of, so this is a one-button notice, not a consent form with
 * categories that would control nothing.
 */
export function CookieBanner() {
  const t = useTranslations('legal.banner');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!readConsent()) setOpen(true);
  }, []);

  if (!open) return null;

  const acknowledge = () => {
    writeConsent({ acknowledgedAt: new Date().toISOString() });
    setOpen(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4">
      <div className="container max-w-3xl rounded-lg border border-border bg-card p-5 shadow-card">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-accent/10 text-accent">
            <Cookie className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <h3 className="font-heading text-base font-semibold text-foreground">{t('title')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('description')}{' '}
              <Link href="/legal/cookies" className="text-primary-accent hover:underline">
                {t('cookiePolicyLink')}
              </Link>
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button onClick={acknowledge}>{t('accept')}</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
