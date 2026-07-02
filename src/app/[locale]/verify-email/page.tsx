'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/routing';
import { MailCheck, Sparkles } from 'lucide-react';

const COPY = {
  it: {
    title: 'Controlla la tua email',
    subtitle: 'Ti abbiamo inviato un link di conferma',
    body: (email: string) =>
      `Abbiamo inviato un link di verifica a ${email}. Clicca il link per attivare il tuo account. Questa pagina si aggiorna automaticamente.`,
    noEmail: 'Abbiamo inviato un link di verifica al tuo indirizzo email.',
    backToLogin: 'Torna al login',
    waiting: 'In attesa della conferma…',
  },
  en: {
    title: 'Check your email',
    subtitle: 'We sent you a confirmation link',
    body: (email: string) =>
      `We sent a verification link to ${email}. Click it to activate your account. This page updates automatically.`,
    noEmail: 'We sent a verification link to your email address.',
    backToLogin: 'Back to login',
    waiting: 'Waiting for confirmation…',
  },
} as const;

function VerifyEmailPageInner() {
  const params = useParams();
  const search = useSearchParams();
  const locale = params?.locale === 'en' ? 'en' : 'it';
  const t = COPY[locale];
  const email = search.get('email') || '';

  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!email) return;
    const interval = setInterval(async () => {
      setChecking(true);
      try {
        const res = await fetch(`/api/auth/email-status?email=${encodeURIComponent(email)}`);
        const data = await res.json();
        if (data.verified) {
          clearInterval(interval);
          window.location.href = `/${locale}/welcome`;
        }
      } catch {
        // ignore transient errors
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [email, locale]);

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="font-heading text-lg font-bold text-primary">Anlyra</span>
          </Link>
          <span className="mt-4 grid h-12 w-12 place-items-center rounded-full bg-secondary">
            <MailCheck className="h-6 w-6 text-primary" />
          </span>
          <CardTitle className="mt-2">{t.title}</CardTitle>
          <CardDescription>{t.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">{email ? t.body(email) : t.noEmail}</p>
          {checking && <p className="mt-3 text-xs text-muted-foreground">{t.waiting}</p>}
          <p className="mt-6 text-xs text-muted-foreground">
            <Link href="/login" className="text-primary-accent hover:underline">
              {t.backToLogin}
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

function VerifyEmailPageFallback() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardContent className="py-10">
          <div className="animate-pulse space-y-3">
            <div className="mx-auto h-8 w-32 rounded-md bg-muted" />
            <div className="mx-auto h-12 w-12 rounded-full bg-muted" />
            <div className="h-4 w-full rounded-md bg-muted" />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailPageFallback />}>
      <VerifyEmailPageInner />
    </Suspense>
  );
}
