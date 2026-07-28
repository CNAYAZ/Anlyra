'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Download, Trash2, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api/fetcher';

type Scope = {
  organizationIncluded: boolean;
  graceDays: number;
  alreadyRequested: boolean;
  requestedAt: string | null;
  canConfirmWithPassword: boolean;
};

// Server error code → i18n key, same approach as the password form above it.
const ERROR_KEY: Record<string, string> = {
  PASSWORD_INVALID: 'privacyDeletePasswordInvalid',
  MISSING_PASSWORD: 'privacyDeletePasswordInvalid',
  NO_PASSWORD_SET: 'privacyDeleteNoPassword',
};

/**
 * The two GDPR controls: export (art. 15/20) and deletion (art. 17).
 *
 * The deletion scope shown here is NOT decided by the client: it is read from
 * GET /api/gdpr/account, which applies the same role check the POST will, so the
 * warning can never promise something different from what the server does.
 */
export default function PrivacyPanel() {
  const t = useTranslations('settings');
  const locale = useLocale();
  const [scope, setScope] = useState<Scope | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState('');
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    apiFetch<Scope>('/api/gdpr/account')
      .then(setScope)
      .catch(() => setScope(null));
  }, []);

  async function downloadExport() {
    if (exporting) return;
    setExporting(true);
    setError('');
    try {
      const res = await fetch('/api/gdpr/export');
      if (!res.ok) throw new Error('EXPORT_FAILED');
      // Read as a blob and save it: the response is a file, not app JSON, so it
      // must not go through apiFetch's envelope parsing.
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `anlyra-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError(t('privacyExportFailed'));
    } finally {
      setExporting(false);
    }
  }

  async function confirmDeletion(e: React.FormEvent) {
    e.preventDefault();
    if (deleting) return;
    setDeleting(true);
    setError('');
    try {
      await apiFetch('/api/gdpr/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      setDone(true);
      // Access is revoked server-side the moment the request lands, so end the
      // session here too. Absolute reload (never router.push) as everywhere else.
      setTimeout(() => {
        window.location.href = `/api/auth/logout?locale=${locale}`;
      }, 1500);
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      setError(t(ERROR_KEY[code] ?? 'privacyDeleteFailed'));
      setDeleting(false);
    }
  }

  const days = scope?.graceDays ?? 30;

  return (
    <div className="card space-y-5">
      <h2 className="font-heading text-lg font-semibold">{t('privacyTitle')}</h2>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Export ── */}
      <div className="space-y-2 border-b border-border pb-5">
        <h3 className="text-sm font-medium">{t('privacyExportTitle')}</h3>
        <p className="text-sm text-muted-foreground">{t('privacyExportDesc')}</p>
        <button
          type="button"
          onClick={downloadExport}
          disabled={exporting}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          {exporting ? t('privacyExportPreparing') : t('privacyExportButton')}
        </button>
      </div>

      {/* ── Deletion ── */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-danger">{t('privacyDeleteTitle')}</h3>

        {done ? (
          <p className="text-sm text-muted-foreground">{t('privacyDeleteDone')}</p>
        ) : scope?.alreadyRequested ? (
          <p className="text-sm text-muted-foreground">
            {t('privacyDeleteGrace', { days })}
          </p>
        ) : !confirming ? (
          <>
            <p className="text-sm text-muted-foreground">{t('privacyDeleteDesc', { days })}</p>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-danger/40 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10"
            >
              <Trash2 className="h-4 w-4" />
              {t('privacyDeleteButton')}
            </button>
          </>
        ) : (
          <form onSubmit={confirmDeletion} className="space-y-4 rounded-lg border border-danger/40 bg-danger/5 p-4">
            <p className="text-sm font-medium">{t('privacyDeleteDialogTitle')}</p>
            {/* Spelled out, not summarised: this is the last screen before the
                request is recorded. */}
            <p className="text-sm text-muted-foreground">
              {scope?.organizationIncluded
                ? t('privacyDeleteScopeOrg')
                : t('privacyDeleteScopeMember')}
            </p>
            <p className="text-sm text-muted-foreground">{t('privacyDeleteGrace', { days })}</p>

            <div className="space-y-1">
              <Label htmlFor="delete-pwd">{t('privacyDeletePasswordLabel')}</Label>
              <Input
                id="delete-pwd"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={deleting || !password}
                className="inline-flex items-center gap-2 rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                {t('privacyDeleteConfirm')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirming(false);
                  setPassword('');
                  setError('');
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                {t('privacyDeleteCancel')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
