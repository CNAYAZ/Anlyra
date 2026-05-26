'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { Smartphone, ShieldCheck, Copy } from 'lucide-react';
import { Input } from '@/components/ui/input';

const COPY = {
  it: {
    title: 'Autenticazione a due fattori (2FA)',
    descOff: 'Aggiungi un livello di sicurezza con un’app di autenticazione (TOTP).',
    descOn: 'Il 2FA è attivo sul tuo account.',
    active: 'Attivo',
    setup: 'Attiva 2FA',
    scan: 'Scansiona questo QR con Google Authenticator, Authy o simili, poi inserisci il codice a 6 cifre.',
    manual: 'Oppure inserisci manualmente questa chiave:',
    code: 'Codice a 6 cifre',
    verify: 'Verifica e attiva',
    verifying: 'Verifica…',
    disable: 'Disattiva 2FA',
    disabling: 'Disattivazione…',
    pwd: 'Conferma con la password',
    backupTitle: 'Codici di backup',
    backupHint: 'Salva questi codici in un posto sicuro. Ognuno è utilizzabile una sola volta se perdi l’accesso all’app.',
    invalidCode: 'Codice non valido. Riprova.',
    invalidPwd: 'Password errata.',
    done: 'Fatto',
    copy: 'Copia',
  },
  en: {
    title: 'Two-factor authentication (2FA)',
    descOff: 'Add a security layer with an authenticator app (TOTP).',
    descOn: '2FA is active on your account.',
    active: 'Active',
    setup: 'Enable 2FA',
    scan: 'Scan this QR with Google Authenticator, Authy or similar, then enter the 6-digit code.',
    manual: 'Or enter this key manually:',
    code: '6-digit code',
    verify: 'Verify & enable',
    verifying: 'Verifying…',
    disable: 'Disable 2FA',
    disabling: 'Disabling…',
    pwd: 'Confirm with your password',
    backupTitle: 'Backup codes',
    backupHint: 'Store these somewhere safe. Each can be used once if you lose access to your app.',
    invalidCode: 'Invalid code. Try again.',
    invalidPwd: 'Wrong password.',
    done: 'Done',
    copy: 'Copy',
  },
} as const;

export default function TwoFactorPanel() {
  const locale = (useLocale() === 'en' ? 'en' : 'it') as 'it' | 'en';
  const t = COPY[locale];

  const [enabled, setEnabled] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/auth/2fa/status')
      .then((r) => r.json())
      .then((d) => {
        setEnabled(!!d.enabled);
        setHasPassword(!!d.hasPassword);
      })
      .catch(() => {});
  }, []);

  async function startSetup() {
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/auth/2fa/setup', { method: 'POST' });
      const data = await res.json();
      setQr(data.qrCode);
      setSecret(data.secret);
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(t.invalidCode);
        return;
      }
      setBackupCodes(data.backupCodes || []);
      setEnabled(true);
      setQr(null);
      setSecret('');
      setCode('');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError(t.invalidPwd);
        return;
      }
      setEnabled(false);
      setPassword('');
      setBackupCodes([]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Smartphone className="h-5 w-5 text-primary-accent" />
          <div>
            <h2 className="font-heading text-base font-semibold">{t.title}</h2>
            <p className="text-xs text-muted-foreground">{enabled ? t.descOn : t.descOff}</p>
          </div>
        </div>
        {enabled && (
          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
            <ShieldCheck className="h-3.5 w-3.5" /> {t.active}
          </span>
        )}
      </div>

      {/* Backup codes shown right after enabling */}
      {backupCodes.length > 0 && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-3">
          <p className="mb-2 text-sm font-medium">{t.backupTitle}</p>
          <p className="mb-2 text-xs text-muted-foreground">{t.backupHint}</p>
          <div className="grid grid-cols-2 gap-1 font-mono text-sm tabular-nums sm:grid-cols-5">
            {backupCodes.map((c) => (
              <span key={c} className="rounded bg-background px-2 py-1 text-center">
                {c}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(backupCodes.join('\n'))}
            className="mt-2 inline-flex items-center gap-1 text-xs text-primary-accent hover:underline"
          >
            <Copy className="h-3.5 w-3.5" /> {t.copy}
          </button>
        </div>
      )}

      {!enabled && !qr && (
        <button
          type="button"
          onClick={startSetup}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {t.setup}
        </button>
      )}

      {!enabled && qr && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t.scan}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="2FA QR code" width={160} height={160} className="rounded-lg border border-border" />
          <p className="text-xs text-muted-foreground">
            {t.manual} <span className="font-mono">{secret}</span>
          </p>
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <Input
                inputMode="numeric"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-32 tabular-nums"
              />
            </div>
            <button
              type="button"
              onClick={verify}
              disabled={busy || code.length < 6}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              {busy ? t.verifying : t.verify}
            </button>
          </div>
        </div>
      )}

      {enabled && (
        <div className="flex items-end gap-2">
          {hasPassword && (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t.pwd}</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-56" />
            </div>
          )}
          <button
            type="button"
            onClick={disable}
            disabled={busy || (hasPassword && !password)}
            className="inline-flex items-center gap-2 rounded-lg border border-danger/40 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10 disabled:opacity-60"
          >
            {busy ? t.disabling : t.disable}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
