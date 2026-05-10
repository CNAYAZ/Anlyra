'use client';

export const dynamic = 'force-dynamic';

import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Mail } from 'lucide-react';
import { apiFetch } from '@/lib/api/fetcher';
import { Skeleton } from '@/components/ui/skeleton';

type Pref = { channel: string; category: string; enabled: boolean };
type PrefsResp = { preferences: Pref[] };

const CATEGORIES = ['alerts', 'reports', 'billing', 'system'] as const;
const CHANNELS = ['email', 'inapp'] as const;

export default function SettingsNotificationsPage() {
  const t = useTranslations('settings');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['settings-notifications'],
    queryFn: () => apiFetch<PrefsResp>('/api/settings/notifications'),
  });

  const mutation = useMutation({
    mutationFn: (body: Pref) =>
      apiFetch('/api/settings/notifications', { method: 'PATCH', body: JSON.stringify(body) }),
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: ['settings-notifications'] });
      const prev = qc.getQueryData<PrefsResp>(['settings-notifications']);
      qc.setQueryData<PrefsResp>(['settings-notifications'], (old) => {
        if (!old) return old;
        return {
          preferences: old.preferences.map((p) =>
            p.channel === body.channel && p.category === body.category ? { ...p, enabled: body.enabled } : p,
          ),
        };
      });
      return { prev };
    },
    onError: (_err, _body, ctx) => {
      if (ctx?.prev) qc.setQueryData(['settings-notifications'], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['settings-notifications'] });
    },
  });

  function isEnabled(channel: string, category: string): boolean {
    return data?.preferences.find((p) => p.channel === channel && p.category === category)?.enabled ?? true;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold">{t('notifTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('notifSubtitle')}</p>
      </div>

      {isLoading || !data ? (
        <Skeleton className="h-72 rounded-xl" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">{t('notifColCategory')}</th>
                {CHANNELS.map((c) => (
                  <th key={c} className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {c === 'email' ? <Mail className="h-3 w-3" /> : <Bell className="h-3 w-3" />}
                      <span>{t(`notifChannel${c.charAt(0).toUpperCase()}${c.slice(1)}` as 'notifChannelEmail')}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map((cat) => (
                <tr key={cat} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{t(`notifCategory${cat.charAt(0).toUpperCase()}${cat.slice(1)}` as 'notifCategoryAlerts')}</p>
                      <p className="text-xs text-muted-foreground">{t(`notifCategory${cat.charAt(0).toUpperCase()}${cat.slice(1)}Desc` as 'notifCategoryAlertsDesc')}</p>
                    </div>
                  </td>
                  {CHANNELS.map((ch) => {
                    const enabled = isEnabled(ch, cat);
                    return (
                      <td key={ch} className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => mutation.mutate({ channel: ch, category: cat, enabled: !enabled })}
                          aria-pressed={enabled}
                          className={`relative inline-block h-6 w-11 rounded-full transition-colors ${enabled ? 'bg-success' : 'bg-muted'}`}
                        >
                          <span
                            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`}
                          />
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
