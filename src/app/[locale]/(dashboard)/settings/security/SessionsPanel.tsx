'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { LogOut } from 'lucide-react';
import { apiFetch } from '@/lib/api/fetcher';

// "Sign out of all other devices": POST /api/auth/sessions/revoke-others.
// The device that presses it receives a renewed session in the same response,
// so it stays signed in; every other session is refused from its next request.
export default function SessionsPanel() {
  const t = useTranslations('settings');
  const [status, setStatus] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');

  async function revokeOthers() {
    setStatus('busy');
    try {
      await apiFetch('/api/auth/sessions/revoke-others', { method: 'POST' });
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="card space-y-3">
      <h2 className="font-heading text-lg font-semibold">{t('securitySessionsTitle')}</h2>
      <p className="text-sm text-muted-foreground">{t('securitySessionsDesc')}</p>
      {status === 'done' && <p className="text-sm text-success">{t('securitySessionsDone')}</p>}
      {status === 'error' && <p className="text-sm text-danger">{t('securitySessionsFailed')}</p>}
      <button
        type="button"
        onClick={revokeOthers}
        disabled={status === 'busy'}
        className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
      >
        <LogOut className="h-4 w-4" />
        {status === 'busy' ? t('securitySessionsPending') : t('securitySessionsButton')}
      </button>
    </div>
  );
}
