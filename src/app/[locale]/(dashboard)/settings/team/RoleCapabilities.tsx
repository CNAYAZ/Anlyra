'use client';

import { useTranslations } from 'next-intl';

const ROLES = ['owner', 'admin', 'editor', 'viewer'] as const;

/**
 * Compact reference of what each role can actually do, shown next to both
 * places a role is chosen: the invite form and the per-member role select
 * (settings/team/page.tsx). Verified against the server guards before
 * writing the text — see src/lib/auth/require-role.ts — and kept in sync
 * with them: it must never claim a restriction the guards do not enforce,
 * or promise a permission they refuse.
 *
 *   owner  — requireOwnerRole (billing) + requireManagerRole (delete/manage/
 *            settings/team/integrations) + requireEditorRole (write data, AI),
 *            plus the owner-only carve-out in settings/team/members/[id] for
 *            touching an owner row or assigning the owner role.
 *   admin  — requireManagerRole + requireEditorRole, never requireOwnerRole.
 *   editor — requireEditorRole only: not requireManagerRole (no delete, no
 *            org settings, no team, no integrations, no report sharing).
 *   viewer — none of the three: read-only. The few read-shaped actions this
 *            leaves reachable (a reminder DRAFT, a report already-generated
 *            PDF, an import duplicate check) are deliberate — see the report
 *            that added requireEditorRole — and are still "reading", so the
 *            text below does not need to carve them out.
 */
export function RoleCapabilities() {
  const t = useTranslations('settings');
  return (
    <ul className="space-y-1 text-xs text-muted-foreground">
      {ROLES.map((r) => (
        <li key={r}>
          <span className="font-medium text-foreground">
            {t(`role${r.charAt(0).toUpperCase()}${r.slice(1)}` as 'roleOwner')}:
          </span>{' '}
          {t(`role${r.charAt(0).toUpperCase()}${r.slice(1)}Hint` as 'roleOwnerHint')}
        </li>
      ))}
    </ul>
  );
}
