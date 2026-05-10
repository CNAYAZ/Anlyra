'use client';

export const dynamic = 'force-dynamic';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { useAppLocale } from '@/hooks/use-locale';
import { formatDate } from '@/lib/utils';
import { apiFetch } from '@/lib/api/fetcher';
import { Skeleton } from '@/components/ui/skeleton';
import { UserCircle2 } from 'lucide-react';

type Member = {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  role: string;
  joinedAt: string;
};

const ROLE_BADGE: Record<string, string> = {
  owner: 'border-primary-accent/30 bg-primary-accent/10 text-primary-accent',
  admin: 'border-warning/40 bg-warning/10 text-warning',
  member: 'border-border bg-muted text-muted-foreground',
};

export default function SettingsTeamPage() {
  const t = useTranslations('settings');
  const locale = useAppLocale();

  const { data, isLoading } = useQuery({
    queryKey: ['settings-team'],
    queryFn: () => apiFetch<{ members: Member[] }>('/api/settings/team'),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold">{t('teamTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('teamSubtitle')}</p>
      </div>

      {isLoading || !data ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : data.members.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
          {t('teamEmpty')}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">{t('teamColUser')}</th>
                <th className="px-4 py-3 text-left">{t('teamColEmail')}</th>
                <th className="px-4 py-3 text-left">{t('teamColRole')}</th>
                <th className="px-4 py-3 text-left">{t('teamColJoined')}</th>
              </tr>
            </thead>
            <tbody>
              {data.members.map((m) => (
                <tr key={m.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <UserCircle2 className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">{m.name ?? m.email.split('@')[0]}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{m.email}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${ROLE_BADGE[m.role] ?? ROLE_BADGE.member}`}>
                      {t(`role${m.role.charAt(0).toUpperCase()}${m.role.slice(1)}` as 'roleOwner')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatDate(m.joinedAt, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">{t('teamInviteNote')}</p>
    </div>
  );
}
