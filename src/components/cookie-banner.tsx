'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Cookie } from 'lucide-react';

const STORAGE_KEY = 'pro:cookie-consent';

type Consent = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  decidedAt: string;
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

export function CookieBanner() {
  const t = useTranslations('legal.banner');
  const [open, setOpen] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const c = readConsent();
    if (!c) setOpen(true);
  }, []);

  if (!open) return null;

  const decide = (a: boolean, m: boolean) => {
    writeConsent({ necessary: true, analytics: a, marketing: m, decidedAt: new Date().toISOString() });
    setOpen(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4">
      <div className="container max-w-3xl rounded-lg border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-accent/10 text-accent">
            <Cookie className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <h3 className="font-heading text-base font-semibold text-slate-900">{t('title')}</h3>
            <p className="mt-1 text-sm text-slate-500">{t('description')}</p>

            {customizing ? (
              <div className="mt-4 space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                <Row
                  title={t('categories.necessary.title')}
                  description={t('categories.necessary.description')}
                  checked
                  disabled
                />
                <Row
                  title={t('categories.analytics.title')}
                  description={t('categories.analytics.description')}
                  checked={analytics}
                  onCheckedChange={setAnalytics}
                />
                <Row
                  title={t('categories.marketing.title')}
                  description={t('categories.marketing.description')}
                  checked={marketing}
                  onCheckedChange={setMarketing}
                />
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {customizing ? (
                <Button onClick={() => decide(analytics, marketing)}>{t('save')}</Button>
              ) : (
                <Button onClick={() => decide(true, true)}>{t('accept')}</Button>
              )}
              <Button variant="secondary" onClick={() => decide(false, false)}>
                {t('reject')}
              </Button>
              {!customizing ? (
                <Button variant="ghost" onClick={() => setCustomizing(true)}>
                  {t('customize')}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  title,
  description,
  checked,
  onCheckedChange,
  disabled
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange?: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <Label className="text-slate-900">{title}</Label>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}
