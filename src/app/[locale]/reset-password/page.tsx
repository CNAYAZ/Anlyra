'use client';

import { Suspense, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from '@/i18n/routing';
import { Sparkles, Check, X } from 'lucide-react';

const COPY = {
  it: {
    title: 'Nuova password',
    subtitle: 'Scegli una password sicura',
    password: 'Nuova password',
    confirm: 'Conferma password',
    submit: 'Reimposta password',
    saving: 'Salvataggio…',
    success: 'Password aggiornata. Ora puoi accedere.',
    goLogin: 'Vai al login',
    invalid: 'Link non valido o scaduto. Richiedine uno nuovo.',
    mismatch: 'Le password non coincidono.',
    req: { len: 'Almeno 12 caratteri', upper: 'Una maiuscola', num: 'Un numero', special: 'Un carattere speciale' },
  },
  en: {
    title: 'New password',
    subtitle: 'Choose a strong password',
    password: 'New password',
    confirm: 'Confirm password',
    submit: 'Reset password',
    saving: 'Saving…',
    success: 'Password updated. You can now sign in.',
    goLogin: 'Go to login',
    invalid: 'Invalid or expired link. Request a new one.',
    mismatch: 'Passwords do not match.',
    req: { len: 'At least 12 characters', upper: 'One uppercase', num: 'One number', special: 'One special char' },
  },
} as const;

function ResetPasswordPageInner() {
  const params = useParams();
  const search = useSearchParams();
  const locale = params?.locale === 'en' ? 'en' : 'it';
  const t = COPY[locale];
  const token = search.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const checks = {
    len: password.length >= 12,
    upper: /[A-Z]/.test(password),
    num: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  const valid = Object.values(checks).every(Boolean);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError(t.mismatch);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        setError(t.invalid);
        return;
      }
      setSuccess(true);
    } catch {
      setError(t.invalid);
    } finally {
      setLoading(false);
    }
  }

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
          <CardTitle className="mt-4">{t.title}</CardTitle>
          <CardDescription>{t.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="text-center">
              <p className="text-sm text-primary">{t.success}</p>
              <p className="mt-4">
                <Link href="/login" className="text-primary-accent hover:underline">
                  {t.goLogin}
                </Link>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="password">{t.password}</Label>
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
              </div>
              <ul className="space-y-1 text-xs">
                {(['len', 'upper', 'num', 'special'] as const).map((k) => (
                  <li key={k} className={checks[k] ? 'flex items-center gap-1.5 text-primary' : 'flex items-center gap-1.5 text-muted-foreground'}>
                    {checks[k] ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    {t.req[k]}
                  </li>
                ))}
              </ul>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">{t.confirm}</Label>
                <Input id="confirm" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button className="w-full" type="submit" disabled={loading || !valid || !token}>
                {loading ? t.saving : t.submit}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function ResetPasswordPageFallback() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardContent className="py-10">
          <div className="animate-pulse space-y-3">
            <div className="mx-auto h-8 w-32 rounded-md bg-muted" />
            <div className="h-9 w-full rounded-md bg-muted" />
            <div className="h-9 w-full rounded-md bg-muted" />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordPageFallback />}>
      <ResetPasswordPageInner />
    </Suspense>
  );
}
