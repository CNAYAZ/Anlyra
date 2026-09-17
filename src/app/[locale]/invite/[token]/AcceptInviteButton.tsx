'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

const LABELS = {
  it: { accept: 'Accetta invito', accepting: 'Accettazione…', error: 'Errore. Riprova.' },
  en: { accept: 'Accept invite', accepting: 'Accepting…', error: 'Error. Please retry.' },
} as const;

/**
 * `seatLimitMessage` arrives as a prop, already translated, from the server
 * page. The route can refuse an acceptance because the inviting organization
 * has run out of the people its plan includes, and the generic "Error. Please
 * retry." below would be both wrong (retrying changes nothing) and useless
 * (it does not say who can fix it). The text lives in it.json/en.json like
 * every other message; it is passed down rather than read here because this is
 * a client component on a public page with no next-intl provider around it,
 * and wiring one in would be a bigger change than this needs.
 */
export default function AcceptInviteButton({
  token,
  locale,
  seatLimitMessage,
}: {
  token: string;
  locale: 'it' | 'en';
  seatLimitMessage: string;
}) {
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
        setError(data?.error === 'SEAT_LIMIT_REACHED' ? seatLimitMessage : l.error);
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
