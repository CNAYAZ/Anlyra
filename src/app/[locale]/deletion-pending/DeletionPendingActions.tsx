'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api/fetcher';

type Labels = {
  cancel: string;
  cancelling: string;
  cancelled: string;
  cancelFailed: string;
  logout: string;
};

export function DeletionPendingActions({
  locale,
  canCancel,
  labels,
}: {
  locale: string;
  canCancel: boolean;
  labels: Labels;
}) {
  const [status, setStatus] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');

  async function cancelDeletion() {
    setStatus('busy');
    try {
      await apiFetch('/api/gdpr/account', { method: 'DELETE' });
      setStatus('done');
      // Full reload, not a router push: the next request must go through the
      // session callback again, which now finds nothing pending and gives the
      // session its user back.
      window.location.href = `/${locale}/overview`;
    } catch {
      setStatus('error');
    }
  }

  function logout() {
    // Always an absolute reload to the logout route (CLAUDE.md §6).
    window.location.href = `/api/auth/logout?locale=${locale}`;
  }

  return (
    <div className="space-y-3 pt-2">
      {status === 'done' && <p className="text-sm">{labels.cancelled}</p>}
      {status === 'error' && <p className="text-sm text-destructive">{labels.cancelFailed}</p>}
      {canCancel && (
        <Button
          type="button"
          className="w-full"
          onClick={cancelDeletion}
          disabled={status === 'busy' || status === 'done'}
        >
          {status === 'busy' ? labels.cancelling : labels.cancel}
        </Button>
      )}
      <Button
        type="button"
        variant={canCancel ? 'secondary' : 'primary'}
        className="w-full"
        onClick={logout}
        disabled={status === 'busy'}
      >
        {labels.logout}
      </Button>
    </div>
  );
}
