'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from '@/i18n/routing';
import { Sparkles } from 'lucide-react';

const COPY = {
  it: {
    title: 'Password dimenticata?',
    subtitle: 'Ti invieremo un link per reimpostarla',
    email: 'Email',
    submit: 'Invia link di reset',
    sending: 'Invio…',
    sent: 'Se l’email è registrata, riceverai un link per reimpostare la password.',
    back: 'Torna al login',
  },
  en: {
    title: 'Forgot your password?',
    subtitle: 'We’ll send you a reset link',
    email: 'Email',
    submit: 'Send reset link',
    sending: 'Sending…',
    sent: 'If the email is registered, you’ll receive a password reset link.',
    back: 'Back to login',
  },
} as const;

export default function ForgotPasswordPage() {
  const params = useParams();
  const locale = params?.locale === 'en' ? 'en' : 'it';
  const t = COPY[locale];

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale }),
      });
      setSent(true);
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
          {sent ? (
            <p className="text-center text-sm text-primary">{t.sent}</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">{t.email}</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </div>
              <Button className="w-full" type="submit" disabled={loading || !email}>
                {loading ? t.sending : t.submit}
              </Button>
            </form>
          )}
          <p className="mt-4 text-center text-xs text-muted-foreground">
            <Link href="/login" className="text-primary-accent hover:underline">
              {t.back}
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
