'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useAppLocale } from '@/hooks/use-locale';
import { formatDate } from '@/lib/utils';

/**
 * Strip shown to EVERY member (not just the owner/admin who requested it)
 * while the organization has a pending deletion request — same shape as
 * TrialExpiredBanner/LegalReacceptBanner, a strip that pushes content down,
 * never an overlay: data stays visible and exportable right up to the date
 * shown here.
 *
 * `deletionDate` is computed server-side (dashboard layout, from a real DB
 * read of Organization.deletionRequestedAt) and passed in as an ISO string —
 * same pattern LegalReacceptBanner uses for `needsReaccept`, one consumer,
 * no shared context needed. `null` renders nothing.
 */
export function OrgDeletionPendingBanner({
  deletionDate,
  organizationName,
}: {
  deletionDate: string | null;
  organizationName: string;
}) {
  const t = useTranslations('deletionPending.memberBanner');
  const locale = useAppLocale();

  if (!deletionDate) return null;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-warning-500/30 bg-warning-50 px-4 py-2.5 text-sm text-warning-700 dark:bg-warning-500/10 dark:text-warning-50 sm:px-6"
    >
      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-[200px] flex-1">
        {t('message', { organization: organizationName, date: formatDate(new Date(deletionDate), locale) })}
      </span>
      <Link
        href="/settings/security"
        className="inline-flex shrink-0 items-center rounded-lg bg-sage-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-sage-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 focus-visible:ring-offset-2"
      >
        {t('cta')}
      </Link>
    </div>
  );
}
