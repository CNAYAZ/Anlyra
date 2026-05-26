'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from '@/i18n/routing';
import { Sparkles, Check, X, Eye, EyeOff } from 'lucide-react';

const COPY = {
  it: {
    title: 'Crea il tuo account',
    subtitle: 'Inizia la prova gratuita di 7 giorni',
    name: 'Nome',
    email: 'Email',
    password: 'Password',
    confirm: 'Conferma password',
    submit: 'Crea account',
    creating: 'Creazione…',
    or: 'oppure',
    google: 'Continua con Google',
    microsoft: 'Continua con Microsoft',
    haveAccount: 'Hai già un account?',
    login: 'Accedi',
    mismatch: 'Le password non coincidono.',
    checkEmail: 'Controlla la tua email per confermare l’account.',
    genericError: 'Qualcosa è andato storto. Riprova.',
    req: {
      len: 'Almeno 12 caratteri',
      upper: 'Una lettera maiuscola',
      num: 'Un numero',
      special: 'Un carattere speciale',
    },
  },
  en: {
    title: 'Create your account',
    subtitle: 'Start your 7-day free trial',
    name: 'Name',
    email: 'Email',
    password: 'Password',
    confirm: 'Confirm password',
    submit: 'Create account',
    creating: 'Creating…',
    or: 'or',
    google: 'Continue with Google',
    microsoft: 'Continue with Microsoft',
    haveAccount: 'Already have an account?',
    login: 'Sign in',
    mismatch: 'Passwords do not match.',
    checkEmail: 'Check your email to confirm your account.',
    genericError: 'Something went wrong. Please try again.',
    req: {
      len: 'At least 12 characters',
      upper: 'One uppercase letter',
      num: 'One number',
      special: 'One special character',
    },
  },
} as const;

export default function SignupPage() {
  const params = useParams();
  const locale = params?.locale === 'en' ? 'en' : 'it';
  const t = COPY[locale];

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const checks = {
    len: password.length >= 12,
    upper: /[A-Z]/.test(password),
    num: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  const passwordValid = Object.values(checks).every(Boolean);
  const canSubmit = email && passwordValid && password === confirm && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError(t.mismatch);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, locale }),
      });
      if (!res.ok) {
        setError(t.genericError);
        return;
      }
      setDone(true);
      window.location.href = `/${locale}/verify-email?email=${encodeURIComponent(email)}`;
    } catch {
      setError(t.genericError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
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
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" type="button" onClick={() => signIn('google', { callbackUrl: `/${locale}/welcome` })}>
              {t.google}
            </Button>
            <Button variant="secondary" type="button" onClick={() => signIn('microsoft-entra-id', { callbackUrl: `/${locale}/welcome` })}>
              {t.microsoft}
            </Button>
          </div>
          <div className="relative my-4 flex items-center gap-3">
            <hr className="flex-1 border-border" />
            <span className="text-xs text-muted-foreground">{t.or}</span>
            <hr className="flex-1 border-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">{t.name}</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">{t.email}</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t.password}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={show ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-label={show ? 'Hide password' : 'Show password'}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
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
              <Input id="confirm" type={show ? 'text' : 'password'} required value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {done && <p className="text-sm text-primary">{t.checkEmail}</p>}
            <Button className="w-full" type="submit" disabled={!canSubmit}>
              {loading ? t.creating : t.submit}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            {t.haveAccount}{' '}
            <Link href="/login" className="text-primary-accent hover:underline">
              {t.login}
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
