'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

const LABELS = {
  it: { accept: 'Accetta invito', accepting: 'Accettazione…', error: 'Errore. Riprova.' },
  en: { accept: 'Accept invite', accepting: 'Accepting…', error: 'Error. Please retry.' },
} as const;

export default function AcceptInviteButton({ token, locale }: { token: string; locale: 'it' | 'en' }) {
  const l = LABELS[locale];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function accept() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(l.error);
        return;
      }
      // Switch into the joined org and land on the dashboard.
      await fetch('/api/orgs/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: data.organizationId }),
      }).catch(() => {});
      window.location.href = `/${locale}/overview`;
    } catch {
      setError(l.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button className="w-full" onClick={accept} disabled={loading}>
        {loading ? l.accepting : l.accept}
      </Button>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
