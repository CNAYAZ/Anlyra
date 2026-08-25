'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { CircleAlert, CheckCircle2, Loader2, MessageSquareWarning } from 'lucide-react';
import { usePathname } from '@/i18n/navigation';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { FormError } from '@/components/ui/form-error';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api/fetcher';

/**
 * Always-reachable "report a problem" entry point, mounted once in the topbar
 * (present on every dashboard page) rather than in the sidebar's footerNav:
 * footerNav items are plain routed links (see NavItem), and this opens a
 * dialog — bolting an onClick action onto a link-only nav config would be a
 * bigger change than the feature needs. The topbar already hosts this exact
 * "small icon button that opens something" pattern (NotificationBell,
 * ThemeToggle), so this reuses it rather than inventing a new placement.
 */
export function BugReportButton() {
  const t = useTranslations('bugReport');
  const tTopbar = useTranslations('topbar');
  const locale = useLocale();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);

  function reset() {
    setDescription('');
    setFieldError(null);
    setFormError(null);
    setPending(false);
    setSuccess(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const trimmed = description.trim();
    if (!trimmed) {
      setFieldError(t('errorRequired'));
      return;
    }
    setFieldError(null);
    setPending(true);
    try {
      await apiFetch('/api/support/bug-report', {
        method: 'POST',
        body: JSON.stringify({
          description: trimmed,
          // Locale-prefixed path, matching what the user actually sees in the
          // address bar — more useful for reproducing the issue than the
          // locale-stripped pathname alone.
          page: `/${locale}${pathname}`,
          userAgent: navigator.userAgent,
          screenWidth: window.screen.width,
          screenHeight: window.screen.height,
        }),
      });
      setSuccess(true);
    } catch (err) {
      const code = (err as Error).message;
      setFormError(code === 'RATE_LIMITED' ? t('errorRateLimited') : t('errorGeneric'));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Only reset on CLOSE, and only once the dialog has actually
        // finished its close animation would be nicer, but immediate reset
        // is simpler and the form is never visible mid-transition anyway
        // (the success/error state is not meant to survive a reopen).
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={tTopbar('reportProblem')}
          title={tTopbar('reportProblem')}
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <MessageSquareWarning className="h-5 w-5" />
        </button>
      </DialogTrigger>
      <DialogContent size="md">
        {success ? (
          <>
            <DialogHeader>
              <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden />
              <DialogTitle>{t('successTitle')}</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <p className="text-sm text-fg-2">{t('successBody')}</p>
            </DialogBody>
            <DialogFooter>
              <Button type="button" onClick={() => setOpen(false)}>
                {t('close')}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{t('title')}</DialogTitle>
              <DialogDescription>{t('description')}</DialogDescription>
            </DialogHeader>
            <DialogBody className="space-y-4">
              <Field id="bug-report-description" label={t('fieldLabel')} required error={fieldError ?? undefined}>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('fieldPlaceholder')}
                  rows={5}
                  autoFocus
                  disabled={pending}
                />
              </Field>

              {/* Transparency requirement: the user must know what technical
                  context is attached BEFORE sending, not find out afterward. */}
              <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-fg-3">
                <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <div>
                  <p className="font-medium text-fg-2">{t('attachmentsTitle')}</p>
                  <p className="mt-0.5">{t('attachmentsList')}</p>
                </div>
              </div>
            </DialogBody>

            <FormError className="mx-6 mb-2">{formError}</FormError>

            <DialogFooter className="gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {pending ? t('sending') : t('submit')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
