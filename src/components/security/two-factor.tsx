'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import QRCode from 'qrcode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck } from 'lucide-react';

function randomSecret() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let s = '';
  for (let i = 0; i < 32; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export function TwoFactor() {
  const t = useTranslations('security.twofa');
  const [enabled, setEnabled] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [code, setCode] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState('');

  useEffect(() => {
    if (!setupOpen) return;
    const next = randomSecret();
    setSecret(next);
    const otpauth = `otpauth://totp/Pro:you@example.com?secret=${next}&issuer=Pro%20Business%20Analyzer&algorithm=SHA1&digits=6&period=30`;
    QRCode.toDataURL(otpauth, { margin: 1, width: 200 }).then(setQrDataUrl).catch(() => null);
  }, [setupOpen]);

  const verify = () => {
    if (code.length === 6) {
      setEnabled(true);
      setSetupOpen(false);
      setCode('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </div>
          <Badge variant={enabled ? 'success' : 'neutral'}>
            <ShieldCheck className="mr-1 h-3 w-3" />
            {enabled ? t('enabled') : t('disabled')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {!enabled && !setupOpen ? (
          <Button onClick={() => setSetupOpen(true)}>{t('enable')}</Button>
        ) : null}

        {enabled ? (
          <Button variant="secondary" onClick={() => setEnabled(false)}>
            {t('disable')}
          </Button>
        ) : null}

        {setupOpen && !enabled ? (
          <div className="grid gap-6 md:grid-cols-[200px_1fr] md:items-start">
            <div className="grid h-[200px] w-[200px] place-items-center rounded-md border border-border bg-card p-2">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="2FA QR code" className="h-full w-full" />
              ) : (
                <span className="text-xs text-muted-foreground">Generating…</span>
              )}
            </div>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{t('scan')}</p>
              <p className="rounded-md bg-muted px-3 py-2 font-mono text-xs text-foreground">
                {secret}
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="totp">{t('code')}</Label>
                <Input
                  id="totp"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className="font-mono tracking-widest"
                />
              </div>
              <Button onClick={verify} disabled={code.length !== 6}>
                {t('verify')}
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
