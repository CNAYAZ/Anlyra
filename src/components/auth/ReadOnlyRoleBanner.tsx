'use client';

import { useTranslations } from 'next-intl';
import { Eye } from 'lucide-react';
import { useIsReadOnlyRole } from '@/lib/auth/owner-context';

/**
 * Strip shown to a member whose role only reads ('viewer'). Same shape and
 * place as DemoBanner, TrialExpiredBanner and LegalReacceptBanner — pushes
 * content down, never covers it — and the same neutral/info tone as the demo
 * one: nothing is wrong, the member only needs to know why the create/edit
 * controls on every page are disabled, and who can change that.
 *
 * Not dismissible: it IS the explanation for the disabled buttons; each of
 * them only carries a short tooltip (settings.readOnlyRoleShort).
 */
export function ReadOnlyRoleBanner() {
  const t = useTranslations('settings');
  const isReadOnly = useIsReadOnlyRole();
  if (!isReadOnly) return null;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-primary-accent/30 bg-primary-accent/10 px-4 py-2.5 text-sm text-foreground sm:px-6"
    >
      <Eye className="h-4 w-4 shrink-0 text-primary-accent" aria-hidden />
      <span className="min-w-[200px] flex-1">{t('readOnlyRoleBanner')}</span>
    </div>
  );
}
