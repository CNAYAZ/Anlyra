'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { FormError } from '@/components/ui/form-error';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { REPORT_SCHEDULES, type ReportSchedule } from '@/lib/report-sections';

export type ReportEditValues = {
  title: string;
  schedule: ReportSchedule;
  recipients: string;
};

type EditableReport = {
  id: string;
  title: string;
  schedule: string | null;
  recipients: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ReportEditValues) => void;
  pending: boolean;
  report: EditableReport | null;
  /**
   * Server-side errors from the PATCH mutation's onError, keyed the same way
   * builder/page.tsx already maps POST /api/reports' error codes — computed
   * by the CALLER (same code-parsing logic, not duplicated here) since only
   * the page knows the mutation's error. Cleared by the caller on each new
   * submit attempt.
   */
  fieldErrors?: { recipients?: string };
  formError?: string | null;
};

/**
 * Edit dialog for a report's title, cadence and recipients — the same three
 * fields POST /api/reports collects at creation (reports/builder/page.tsx),
 * reused here rather than invented anew: same schedule options
 * (REPORT_SCHEDULES), same recipients field shown only when the schedule
 * is not on_demand, same placeholder and hint text.
 *
 * Sections are NOT editable here — see PATCH /api/reports/[id] for why the
 * scope stops at these three fields.
 */
export function ReportEditDialog({ open, onOpenChange, onSubmit, pending, report, fieldErrors, formError }: Props) {
  const t = useTranslations('reports');
  const [title, setTitle] = useState('');
  const [schedule, setSchedule] = useState<ReportSchedule>('on_demand');
  const [recipients, setRecipients] = useState('');
  const [titleError, setTitleError] = useState<string | undefined>(undefined);

  // Seed from `report` every time the dialog transitions to open — same
  // intent as RecurringExpenseFormDialog's effect-based reset
  // (recurring-expenses/recurring-expense-form-dialog.tsx), but done during
  // render ("adjusting state when a prop changes", React's own documented
  // pattern) instead of inside a useEffect, which would call setState
  // synchronously from an effect body.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open && report) {
      setTitleError(undefined);
      setTitle(report.title);
      setSchedule((report.schedule as ReportSchedule | null) ?? 'on_demand');
      setRecipients(report.recipients ?? '');
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setTitleError(t('errorTitleRequired'));
      return;
    }
    setTitleError(undefined);
    onSubmit({ title: title.trim(), schedule, recipients: recipients.trim() });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('editReport')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            <Field id="rep-edit-title" label={t('builderTitleField')} required error={titleError}>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            </Field>

            <Field id="rep-edit-schedule" label={t('builderSchedule')}>
              <Select value={schedule} onValueChange={(v) => setSchedule(v as ReportSchedule)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_SCHEDULES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`schedule${s.charAt(0).toUpperCase()}${s.slice(1).replace(/_(.)/, (_, c: string) => c.toUpperCase())}` as 'scheduleOnDemand')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {schedule !== 'on_demand' && (
              <Field id="rep-edit-recipients" label={t('builderRecipients')} help={t('builderRecipientsHint')} error={fieldErrors?.recipients}>
                <Input
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                  placeholder="email1@example.com, email2@example.com"
                />
              </Field>
            )}
          </DialogBody>
          {/* Same reasoning as RecurringExpenseFormDialog's saveError: the page's
              own error banner would render behind this modal's overlay. */}
          <FormError className="mx-6 mb-2">{formError}</FormError>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
              {t('cancel')}
            </Button>
            <Button type="submit" loading={pending}>
              {pending ? t('saving') : t('saveReport')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
