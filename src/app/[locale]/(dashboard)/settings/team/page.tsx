'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppLocale } from '@/hooks/use-locale';
import { formatDate } from '@/lib/utils';
import { apiFetch } from '@/lib/api/fetcher';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormError } from '@/components/ui/form-error';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useIsManager } from '@/lib/auth/owner-context';
import { CheckCircle2, MailWarning, UserCircle2 } from 'lucide-react';

type Member = {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  role: string;
  joinedAt: string;
};

type PendingInvite = {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
};

const INVITABLE_ROLES = ['admin', 'editor', 'viewer'] as const;

/**
 * Maps the route's stable error codes to a message. Unlike the public auth
 * routes, this one is allowed to be specific: the caller is a signed-in
 * owner/admin looking at the screen, so "that person is already a member" is
 * useful rather than an information leak.
 */
const ERROR_KEYS: Record<string, string> = {
  SELF_INVITE: 'inviteErrorSelf',
  ALREADY_MEMBER: 'inviteErrorAlreadyMember',
  INVALID_EMAIL: 'inviteErrorEmail',
  DEMO_READ_ONLY: 'inviteErrorDemo',
  RATE_LIMITED: 'inviteErrorRateLimited',
  RATE_LIMIT_UNAVAILABLE: 'inviteErrorUnavailable',
};

const ROLE_BADGE: Record<string, string> = {
  owner: 'border-primary-accent/30 bg-primary-accent/10 text-primary-accent',
  admin: 'border-warning/40 bg-warning/10 text-warning',
  member: 'border-border bg-muted text-muted-foreground',
};

export default function SettingsTeamPage() {
  const t = useTranslations('settings');
  const locale = useAppLocale();
  const qc = useQueryClient();
  const isManager = useIsManager();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<(typeof INVITABLE_ROLES)[number]>('viewer');
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [sent, setSent] = useState<{ email: string; emailSent: boolean } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['settings-team'],
    queryFn: () =>
      apiFetch<{ members: Member[]; invites: PendingInvite[] }>('/api/settings/team'),
  });

  const invite = useMutation({
    mutationFn: (body: { email: string; role: string }) =>
      apiFetch<{ email: string; role: string; reissued: boolean; emailSent: boolean }>(
        '/api/settings/team/invite',
        { method: 'POST', body: JSON.stringify(body) },
      ),
    onMutate: () => {
      setErrorKey(null);
      setSent(null);
    },
    onSuccess: (res) => {
      setSent({ email: res.email, emailSent: res.emailSent });
      setEmail('');
      setRole('viewer');
      qc.invalidateQueries({ queryKey: ['settings-team'] });
    },
    onError: (e: Error) => {
      // apiFetch throws with the route's `error` string as the message.
      setErrorKey(ERROR_KEYS[e.message] ?? 'inviteErrorGeneric');
    },
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

      {/* Pending invites: shown only when there are any, so a team with
          nothing outstanding does not get an empty box. */}
      {data && data.invites.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-heading text-sm font-semibold">{t('invitePendingTitle')}</h2>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">{t('teamColEmail')}</th>
                  <th className="px-4 py-3 text-left">{t('teamColRole')}</th>
                  <th className="px-4 py-3 text-left">{t('invitePendingExpires')}</th>
                </tr>
              </thead>
              <tbody>
                {data.invites.map((inv) => (
                  <tr key={inv.id} className="border-t border-border">
                    <td className="px-4 py-3 text-xs text-muted-foreground">{inv.email}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${ROLE_BADGE[inv.role] ?? ROLE_BADGE.member}`}>
                        {t(`role${inv.role.charAt(0).toUpperCase()}${inv.role.slice(1)}` as 'roleOwner')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
                      {formatDate(inv.expiresAt, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite form. Disabled rather than hidden for a non-manager, with the
          reason written out — same choice as settings/billing's ownerOnly:
          a control that explains why it is unavailable beats one that silently
          is not there. The real check is server-side (requireManagerRole);
          useIsManager only decides what the UI offers. */}
      <form
        className="card space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          invite.mutate({ email: email.trim().toLowerCase(), role });
        }}
      >
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-sm font-semibold">{t('inviteTitle')}</h2>
          <p className="text-xs text-muted-foreground">{t('inviteSubtitle')}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr]">
          <div className="space-y-1">
            <Label htmlFor="invite-email">{t('inviteEmail')}</Label>
            <Input
              id="invite-email"
              type="email"
              required
              disabled={!isManager || invite.isPending}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('inviteEmailPlaceholder')}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="invite-role">{t('teamColRole')}</Label>
            <Select
              value={role}
              disabled={!isManager || invite.isPending}
              onValueChange={(v) => setRole(v as (typeof INVITABLE_ROLES)[number])}
            >
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INVITABLE_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {t(`role${r.charAt(0).toUpperCase()}${r.slice(1)}` as 'roleOwner')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {sent && (
          sent.emailSent ? (
            <div className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 p-3 text-sm text-success">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {t('inviteSent', { email: sent.email })}
            </div>
          ) : (
            // The invite row exists, the email did not go out. Saying "sent"
            // here would leave someone waiting for a message that never
            // arrives.
            <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
              <MailWarning className="mt-0.5 h-4 w-4 shrink-0" />
              {t('inviteCreatedEmailFailed', { email: sent.email })}
            </div>
          )
        )}

        <FormError>{errorKey ? t(errorKey as 'inviteErrorGeneric') : null}</FormError>

        {!isManager && <p className="text-[11px] text-muted-foreground">{t('inviteManagerOnly')}</p>}

        <button
          type="submit"
          disabled={!isManager || invite.isPending || !email.trim()}
          title={!isManager ? t('inviteManagerOnly') : undefined}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {invite.isPending ? t('inviteSending') : t('inviteSubmit')}
        </button>
      </form>
    </div>
  );
}
