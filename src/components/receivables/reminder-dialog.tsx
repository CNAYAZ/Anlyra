'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Copy, Loader2, Mail } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { ReminderVariantDTO } from '@/types/receivable';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  error: boolean;
  variants: ReminderVariantDTO[] | null;
  /** Recipient for the mailto link; when null the email button is disabled. */
  customerEmail: string | null;
};

/**
 * Build a mailto: URL that opens the user's mail client pre-filled. Subject and
 * body are encodeURIComponent-escaped so spaces, Italian accents (à, è) and the
 * euro sign (€) survive; newlines are normalised to CRLF so they encode as
 * %0D%0A, the line break mailto clients expect.
 */
function buildMailto(email: string, subject: string, body: string): string {
  const bodyCRLF = body.replace(/\r?\n/g, '\r\n');
  const params = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyCRLF)}`;
  return `mailto:${encodeURIComponent(email)}?${params}`;
}

export function ReminderDialog({ open, onOpenChange, loading, error, variants, customerEmail }: Props) {
  const t = useTranslations('scadenzario');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copy = async (index: number, subject: string, body: string) => {
    const text = `${subject}\n\n${body}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex((c) => (c === index ? null : c)), 2000);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — silently ignore.
    }
  };

  const sendEmail = (subject: string, body: string) => {
    if (!customerEmail) return;
    window.location.href = buildMailto(customerEmail, subject, body);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{t('reminder.title')}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {loading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('reminder.generating')}
            </p>
          )}

          {error && !loading && (
            <p className="text-sm text-danger">{t('reminder.error')}</p>
          )}

          {!loading && !error && variants?.map((v, i) => (
            <div key={i} className="rounded-md border border-border p-4 space-y-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('reminder.subject')}
                </p>
                <p className="text-sm font-medium text-foreground">{v.subject}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('reminder.body')}
                </p>
                <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">{v.body}</pre>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button size="sm" variant="secondary" onClick={() => copy(i, v.subject, v.body)}>
                  {copiedIndex === i ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedIndex === i ? t('reminder.copied') : t('reminder.copy')}
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  disabled={!customerEmail}
                  onClick={() => sendEmail(v.subject, v.body)}
                  title={customerEmail ? undefined : t('reminder.emailMissingHint')}
                >
                  <Mail className="h-4 w-4" />
                  {t('reminder.sendByEmail')}
                </Button>
              </div>
              {!customerEmail && (
                <p className="text-right text-xs text-muted-foreground">
                  {t('reminder.emailMissingHint')}
                </p>
              )}
            </div>
          ))}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
