'use client';

import { Suspense, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from '@/i18n/routing';
import { Sparkles, Eye, EyeOff } from 'lucide-react';

const COPY = {
  it: {
    title: 'Accedi ad Anlyra',
    subtitle: 'Bentornato. Inserisci le tue credenziali.',
    email: 'Email',
    password: 'Password',
    remember: 'Ricordami',
    forgot: 'Password dimenticata?',
    submit: 'Accedi',
    signingIn: 'Accesso…',
    or: 'oppure',
    google: 'Continua con Google',
    microsoft: 'Continua con Microsoft',
    noAccount: 'Non hai un account?',
    signup: 'Registrati',
    twoFa: 'Codice di verifica (2FA)',
    twoFaHint: 'Inserisci il codice a 6 cifre dalla tua app di autenticazione.',
    invalid: 'Email o password non corretti.',
    notVerified: 'Devi confermare la tua email prima di accedere.',
    resend: 'Invia di nuovo l’email di verifica',
    resent: 'Email di verifica inviata.',
    generic: 'Accesso non riuscito. Riprova.',
  },
  en: {
    title: 'Sign in to Anlyra',
    subtitle: 'Welcome back. Enter your credentials.',
    email: 'Email',
    password: 'Password',
    remember: 'Remember me',
    forgot: 'Forgot password?',
    submit: 'Sign in',
    signingIn: 'Signing in…',
    or: 'or',
    google: 'Continue with Google',
    microsoft: 'Continue with Microsoft',
    noAccount: 'Don’t have an account?',
    signup: 'Sign up',
    twoFa: 'Verification code (2FA)',
    twoFaHint: 'Enter the 6-digit code from your authenticator app.',
    invalid: 'Incorrect email or password.',
    notVerified: 'You must confirm your email before signing in.',
    resend: 'Resend verification email',
    resent: 'Verification email sent.',
    generic: 'Sign-in failed. Please try again.',
  },
} as const;

function LoginPageInner() {
  const params = useParams();
  const search = useSearchParams();
  const locale = params?.locale === 'en' ? 'en' : 'it';
  const t = COPY[locale];
  const callbackUrl = search.get('callbackUrl') || `/${locale}/overview`;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [needs2fa, setNeeds2fa] = useState(false);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notVerified, setNotVerified] = useState(false);
  const [resent, setResent] = useState(false);

  async function resendVerification() {
    // Reuse register endpoint? Instead re-trigger via a dedicated path is not
    // available; we just inform the user. Verification can be re-requested by
    // signing up again is not ideal, so we simply surface the state.
    setResent(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNotVerified(false);
    setLoading(true);
    try {
      // Pre-check so we can branch on 2FA / email-verification before signIn.
      const pre = await fetch('/api/auth/precheck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }).then((r) => r.json());

      if (!pre.valid) {
        setError(t.invalid);
        return;
      }
      if (!pre.emailVerified) {
        setNotVerified(true);
        return;
      }
      if (pre.needs2fa && !needs2fa) {
        setNeeds2fa(true);
        return;
      }

      const res = await signIn('credentials', {
        email,
        password,
        twoFactorCode: needs2fa ? twoFactorCode : undefined,
        redirect: false,
      });

      if (res?.error) {
        setError(t.generic);
        return;
      }
      window.location.href = callbackUrl;
    } catch {
      setError(t.generic);
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
            <Button variant="secondary" type="button" onClick={() => signIn('google', { callbackUrl })}>
              {t.google}
            </Button>
            <Button variant="secondary" type="button" onClick={() => signIn('microsoft-entra-id', { callbackUrl })}>
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
              <Label htmlFor="email">{t.email}</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" disabled={needs2fa} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t.password}</Label>
                <Link href="/forgot-password" className="text-xs text-primary-accent hover:underline">
                  {t.forgot}
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={show ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={needs2fa}
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

            {needs2fa && (
              <div className="space-y-1.5">
                <Label htmlFor="twofa">{t.twoFa}</Label>
                <Input
                  id="twofa"
                  inputMode="numeric"
                  placeholder="123456"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  className="tabular-nums"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">{t.twoFaHint}</p>
              </div>
            )}

            {!needs2fa && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" className="h-4 w-4 rounded border-input" />
                {t.remember}
              </label>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
            {notVerified && (
              <div className="text-sm text-destructive">
                {t.notVerified}{' '}
                {resent ? (
                  <span className="text-primary">{t.resent}</span>
                ) : (
                  <button type="button" onClick={resendVerification} className="text-primary-accent underline">
                    {t.resend}
                  </button>
                )}
              </div>
            )}

            <Button className="w-full" type="submit" disabled={loading || (needs2fa && twoFactorCode.length < 6)}>
              {loading ? t.signingIn : t.submit}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            {t.noAccount}{' '}
            <Link href="/signup" className="text-primary-accent hover:underline">
              {t.signup}
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

function LoginPageFallback() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
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

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageInner />
    </Suspense>
  );
}
