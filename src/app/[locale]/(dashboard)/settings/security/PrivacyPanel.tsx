'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Download, Trash2, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api/fetcher';
import { formatDate } from '@/lib/utils';

type Scope = {
  graceDays: number;
  alreadyRequested: boolean;
  requestedAt: string | null;
  daysRemaining: number | null;
  canConfirmWithPassword: boolean;
  // Companies where this person is the only owner while others still work
  // there: personal deletion is refused until that changes.
  soleOwnerOf: string[];
  // Companies this person is the only member of: personal deletion also sends
  // their deletion for the founder's confirmation.
  soleMemberOf: string[];
  // Owner only. Everything below is null for anyone else, so an admin never
  // sees an option to delete the company.
  canRequestOrganizationDeletion: boolean;
  organizationApprovalPending: { requestedAt: string } | null;
  organizationPending: { requestedAt: string; daysRemaining: number } | null;
};

// Server error code → i18n key, same approach as the password form above it.
const ERROR_KEY: Record<string, string> = {
  PASSWORD_INVALID: 'privacyDeletePasswordInvalid',
  MISSING_PASSWORD: 'privacyDeletePasswordInvalid',
  NO_PASSWORD_SET: 'privacyDeleteNoPassword',
  SOLE_OWNER: 'privacyDeleteSoleOwnerError',
  ORGANIZATION_DELETION_ALREADY_CONFIRMED: 'privacyOrgRequestAlreadyConfirmed',
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
  const [cancellingPersonal, setCancellingPersonal] = useState(false);
  const [cancellingOrg, setCancellingOrg] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [cancelledMessage, setCancelledMessage] = useState('');
  const [orgConfirming, setOrgConfirming] = useState(false);
  const [orgPassword, setOrgPassword] = useState('');
  const [orgRequesting, setOrgRequesting] = useState(false);
  const [orgError, setOrgError] = useState('');
  const [orgMessage, setOrgMessage] = useState('');

  function loadScope() {
    return apiFetch<Scope>('/api/gdpr/account')
      .then(setScope)
      .catch(() => setScope(null));
  }

  useEffect(() => {
    loadScope();
  }, []);

  /**
   * Withdraws a pending request. The personal one and the company's are two
   * separate calls (`?scope=organization` for the company, owner only), each
   * decided server-side by DELETE /api/gdpr/account. After a SUCCESSFUL
   * withdrawal the scope is RE-FETCHED from the server rather than guessed
   * locally, so the panel only ever shows what is actually true in the
   * database.
   */
  async function cancelDeletion(
    setBusy: (v: boolean) => void,
    messageKey: 'privacyDeleteCancelled' | 'privacyOrgDeleteCancelled' | 'privacyOrgApprovalWithdrawn',
    errorKey: 'privacyDeleteCancelFailed' | 'privacyOrgDeleteCancelFailed' | 'privacyOrgApprovalWithdrawFailed',
    organization = false,
  ) {
    setBusy(true);
    setCancelError('');
    setCancelledMessage('');
    setOrgMessage('');
    try {
      await apiFetch(`/api/gdpr/account${organization ? '?scope=organization' : ''}`, { method: 'DELETE' });
      setCancelledMessage(t(messageKey));
      await loadScope();
    } catch {
      setCancelError(t(errorKey));
    } finally {
      setBusy(false);
    }
  }

  /**
   * The owner's request to delete the company. Only RECORDS it as waiting for
   * Anlyra's confirmation — nothing is deleted or blocked, so the owner stays
   * signed in and simply sees the request as pending.
   */
  async function requestOrganizationDeletion(e: React.FormEvent) {
    e.preventDefault();
    if (orgRequesting) return;
    setOrgRequesting(true);
    setOrgError('');
    setOrgMessage('');
    setCancelledMessage('');
    try {
      await apiFetch('/api/gdpr/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: orgPassword, scope: 'organization' }),
      });
      setOrgConfirming(false);
      setOrgPassword('');
      setOrgMessage(t('privacyOrgRequestSent'));
      await loadScope();
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      setOrgError(t(ERROR_KEY[code] ?? 'privacyDeleteFailed'));
    } finally {
      setOrgRequesting(false);
    }
  }

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

        {cancelError && (
          <div className="flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{cancelError}</span>
          </div>
        )}
        {cancelledMessage && (
          <p className="text-sm text-muted-foreground">{cancelledMessage}</p>
        )}

        {done ? (
          <p className="text-sm text-muted-foreground">{t('privacyDeleteDone', { days })}</p>
        ) : scope?.alreadyRequested ? (
          // Visible ONLY while a request is actually pending for THIS account.
          <div className="space-y-2 rounded-lg border border-danger/40 bg-danger/5 p-4">
            <p className="text-sm font-medium">
              {t('privacyDeleteGrace', { days: scope.daysRemaining ?? days })}
            </p>
            <p className="text-sm text-muted-foreground">{t('privacyDeleteHowToCancel')}</p>
            <button
              type="button"
              onClick={() => cancelDeletion(setCancellingPersonal, 'privacyDeleteCancelled', 'privacyDeleteCancelFailed')}
              disabled={cancellingPersonal}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
            >
              {cancellingPersonal ? t('privacyDeleteCancelling') : t('privacyDeleteCancelRequestButton')}
            </button>
          </div>
        ) : scope && scope.soleOwnerOf.length > 0 ? (
          // Option a: refused server-side too (SOLE_OWNER) — this only
          // explains why and what to do instead.
          <p className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
            {t('privacyDeleteSoleOwnerBlocked', { organizations: scope.soleOwnerOf.join(', ') })}
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
            <p className="text-sm text-muted-foreground">{t('privacyDeleteScopeMember')}</p>
            {scope && scope.soleMemberOf.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {t('privacyDeleteSoleMemberNote', { organizations: scope.soleMemberOf.join(', '), days })}
              </p>
            )}
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

      {/* ── Company deletion: OWNER only (the server returns nothing of this to
          anyone else, and refuses their requests). Three states: confirmed by
          Anlyra and counting down, waiting for Anlyra's confirmation, or
          nothing requested yet. */}
      {scope?.canRequestOrganizationDeletion && (
        <div className="space-y-3 border-t border-border pt-5">
          <h3 className="text-sm font-medium text-danger">{t('privacyOrgRequestTitle')}</h3>

          {orgError && (
            <div className="flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{orgError}</span>
            </div>
          )}
          {orgMessage && <p className="text-sm text-muted-foreground">{orgMessage}</p>}

          {scope.organizationPending ? (
            <div className="space-y-2 rounded-lg border border-danger/40 bg-danger/5 p-4">
              <p className="text-sm font-medium">{t('privacyOrgDeleteTitle')}</p>
              <p className="text-sm text-muted-foreground tabular-nums">
                {t('privacyOrgDeleteGrace', { days: scope.organizationPending.daysRemaining })}
              </p>
              <button
                type="button"
                onClick={() => cancelDeletion(setCancellingOrg, 'privacyOrgDeleteCancelled', 'privacyOrgDeleteCancelFailed', true)}
                disabled={cancellingOrg}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
              >
                {cancellingOrg ? t('privacyDeleteCancelling') : t('privacyOrgDeleteCancelButton')}
              </button>
            </div>
          ) : scope.organizationApprovalPending ? (
            <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-4">
              <p className="text-sm font-medium tabular-nums">
                {t('privacyOrgApprovalPending', {
                  date: formatDate(new Date(scope.organizationApprovalPending.requestedAt), locale),
                })}
              </p>
              <p className="text-sm text-muted-foreground">{t('privacyOrgApprovalPendingNote')}</p>
              <button
                type="button"
                onClick={() =>
                  cancelDeletion(setCancellingOrg, 'privacyOrgApprovalWithdrawn', 'privacyOrgApprovalWithdrawFailed', true)
                }
                disabled={cancellingOrg}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
              >
                {cancellingOrg ? t('privacyDeleteCancelling') : t('privacyOrgApprovalWithdrawButton')}
              </button>
            </div>
          ) : !orgConfirming ? (
            <>
              <p className="text-sm text-muted-foreground">{t('privacyOrgRequestDesc')}</p>
              <button
                type="button"
                onClick={() => setOrgConfirming(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-danger/40 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10"
              >
                <Trash2 className="h-4 w-4" />
                {t('privacyOrgRequestButton')}
              </button>
            </>
          ) : (
            <form onSubmit={requestOrganizationDeletion} className="space-y-4 rounded-lg border border-danger/40 bg-danger/5 p-4">
              <p className="text-sm font-medium">{t('privacyOrgRequestDialogTitle')}</p>
              <p className="text-sm text-muted-foreground">{t('privacyOrgRequestDesc')}</p>
              <p className="text-sm text-muted-foreground">{t('privacyOrgRequestScope', { days })}</p>

              <div className="space-y-1">
                <Label htmlFor="org-delete-pwd">{t('privacyDeletePasswordLabel')}</Label>
                <Input
                  id="org-delete-pwd"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={orgPassword}
                  onChange={(e) => setOrgPassword(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={orgRequesting || !orgPassword}
                  className="inline-flex items-center gap-2 rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  {t('privacyOrgRequestConfirm')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOrgConfirming(false);
                    setOrgPassword('');
                    setOrgError('');
                  }}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  {t('privacyDeleteCancel')}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
