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
import { useIsManager, useIsOwner } from '@/lib/auth/owner-context';
import { RoleCapabilities } from './RoleCapabilities';
import { usePlan } from '@/lib/billing/context';
import { isUnlimited, countedSeats } from '@/lib/billing/plans';
import { CheckCircle2, MailWarning, Trash2, UserCircle2, UserMinus, Users } from 'lucide-react';
import { Link } from '@/i18n/navigation';

/** The four roles a member can be set to. 'owner' is assignable only BY an owner. */
const ASSIGNABLE_ROLES = ['owner', 'admin', 'editor', 'viewer'] as const;

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
  // The plan's seats are all taken — counting people already in PLUS invites
  // still waiting to be accepted, which is how the route counts them.
  SEAT_LIMIT_REACHED: 'inviteErrorSeatLimit',
  DEMO_READ_ONLY: 'inviteErrorDemo',
  RATE_LIMITED: 'inviteErrorRateLimited',
  RATE_LIMIT_UNAVAILABLE: 'inviteErrorUnavailable',
  // Revoke-specific: NOT_FOUND covers both "already revoked by someone else"
  // and "belongs to another organization" — the route answers both alike on
  // purpose (see the route's comment), so the UI cannot and does not try to
  // tell them apart either.
  NOT_FOUND: 'inviteRevokeErrorNotFound',
  ALREADY_ACCEPTED: 'inviteRevokeErrorAccepted',
};

/**
 * Separate map for the member controls: NOT_FOUND means something different
 * here ("that person is no longer in this team") than it does for an invite,
 * so the two cannot share one table.
 */
const MEMBER_ERROR_KEYS: Record<string, string> = {
  NOT_FOUND: 'memberErrorNotFound',
  CANNOT_CHANGE_OWN_ROLE: 'memberErrorOwnRole',
  CANNOT_REMOVE_SELF: 'memberErrorRemoveSelf',
  OWNER_REQUIRED: 'memberErrorOwnerRequired',
  LAST_OWNER: 'memberErrorLastOwner',
  CONFLICT: 'memberErrorConflict',
  DEMO_READ_ONLY: 'inviteErrorDemo',
  // Promoting a free viewer to a full-access role needs a seat the plan
  // does not have (checkSeatAvailability 'role').
  SEAT_LIMIT_REACHED: 'memberErrorSeatLimit',
};

const ROLE_BADGE: Record<string, string> = {
  owner: 'border-primary-accent/30 bg-primary-accent/10 text-primary-accent',
  admin: 'border-warning/40 bg-warning/10 text-warning',
  member: 'border-border bg-muted text-muted-foreground',
};

export default function SettingsTeamPage() {
  const t = useTranslations('settings');
  const tFeature = useTranslations('feature');
  const locale = useAppLocale();
  const qc = useQueryClient();
  const isManager = useIsManager();
  const isOwner = useIsOwner();

  // Who am I: needed to grey out the controls on my OWN row, because the
  // server refuses changing or removing your own membership. Same endpoint and
  // same cache key the profile menu already uses — no new route.
  const { data: me } = useQuery({
    queryKey: ['settings-profile'],
    queryFn: () => apiFetch<{ id: string }>('/api/settings/profile'),
  });

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<(typeof INVITABLE_ROLES)[number]>('viewer');
  const [errorKey, setErrorKey] = useState<string | null>(null);
  // Kept apart from the invite form's error so a failure on the members table
  // does not appear under the invite button, and vice versa.
  const [memberErrorKey, setMemberErrorKey] = useState<string | null>(null);
  const [sent, setSent] = useState<{ email: string; emailSent: boolean } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['settings-team'],
    queryFn: () =>
      apiFetch<{ members: Member[]; invites: PendingInvite[] }>('/api/settings/team'),
  });

  // ── How many people the plan includes, and how many are taken ──
  // The limit comes from the plan catalog through BillingProvider, which the
  // dashboard layout feeds with the real BillingSubscription plan — the same
  // catalog value (PLANS[plan].limits.users) that checkSeatAvailability
  // enforces on the server.
  //
  // "Taken" is counted the way the server counts it for an invite: people
  // already in PLUS invites still open. The GET above selects invites with the
  // very same condition the check uses (acceptedAt: null, expiresAt in the
  // future), so the number shown here and the number enforced cannot drift.
  const { limits } = usePlan();
  const seatLimit = limits.users;
  const freeViewers = limits.freeViewers;
  const seatsAreUnlimited = isUnlimited(seatLimit);
  const membersCount = data?.members.length ?? 0;
  const invitesCount = data?.invites.length ?? 0;
  // Seats are counted with the same countedSeats() the server uses: viewers
  // take no seat up to the plan's freeViewers (PRO includes one, for the
  // accountant).
  const memberRoles = data?.members.map((m) => m.role) ?? [];
  const takenRoles = [...memberRoles, ...(data?.invites.map((i) => i.role) ?? [])];
  const seatsUsed = countedSeats(takenRoles, freeViewers);
  const viewersInUse = Math.min(
    freeViewers,
    takenRoles.filter((r) => r === 'viewer').length,
  );
  // Could one more person with this role be invited? Same test as the
  // server's checkSeatAvailability('invite').
  const canInviteRole = (r: string) =>
    seatsAreUnlimited || countedSeats([...takenRoles, r], freeViewers) <= seatLimit;
  // Could this member's role be changed to `r`? Same test as the server's
  // checkSeatAvailability('role'): members only, and a change that does not
  // raise the count always passes.
  const canChangeRole = (membershipId: string, r: string) => {
    if (seatsAreUnlimited) return true;
    const after = data?.members.map((m) => (m.id === membershipId ? r : m.role)) ?? [];
    const usedAfter = countedSeats(after, freeViewers);
    return usedAfter <= seatLimit || usedAfter <= countedSeats(memberRoles, freeViewers);
  };
  // Only once the counts have actually loaded: while `data` is undefined both
  // are 0, and a plan with 0 seats does not exist, so nothing is ever blocked
  // on a number we do not have yet. "Full" means not even a viewer fits.
  const seatsFull = !!data && !seatsAreUnlimited && !canInviteRole('viewer');
  // A seat is left only for a free viewer: full-access roles are unavailable.
  const onlyViewerSeat = !!data && !seatsFull && !canInviteRole('editor');
  // Already past the limit — a downgrade leaves the team as it is (nothing in
  // the code removes memberships by plan), so this is a normal state to land
  // in, not a fault. Shown as two plain facts instead of "7 di 5", which reads
  // like a broken counter.
  const seatsOver = !!data && !seatsAreUnlimited && seatsUsed > seatLimit;

  // Why the invite form is unavailable, or null when it is not. Same idea as
  // the members table's `reasonKey` above, and the same precedence: not being
  // a manager is the stronger block, so it wins. `teamSeatsFull` is worded to
  // hold for the over-the-limit case too — there are no free seats either way.
  const inviteBlockedReason = !isManager
    ? t('inviteManagerOnly')
    : seatsFull
      ? t('teamSeatsFull')
      : onlyViewerSeat && role !== 'viewer'
        ? t('teamSeatsViewerOnly')
        : null;

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

  const changeRole = useMutation({
    mutationFn: ({ membershipId, role }: { membershipId: string; role: string }) =>
      apiFetch<{ id: string; role: string }>(`/api/settings/team/members/${membershipId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }),
    onMutate: () => setMemberErrorKey(null),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings-team'] }),
    onError: (e: Error) => setMemberErrorKey(MEMBER_ERROR_KEYS[e.message] ?? 'memberErrorGeneric'),
  });

  const removeMember = useMutation({
    mutationFn: (membershipId: string) =>
      apiFetch<{ id: string; removed: boolean }>(`/api/settings/team/members/${membershipId}`, {
        method: 'DELETE',
      }),
    onMutate: () => setMemberErrorKey(null),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings-team'] }),
    onError: (e: Error) => setMemberErrorKey(MEMBER_ERROR_KEYS[e.message] ?? 'memberErrorGeneric'),
  });

  const revokeInvite = useMutation({
    mutationFn: (inviteId: string) =>
      apiFetch<{ revoked: boolean }>(`/api/settings/team?id=${inviteId}`, { method: 'DELETE' }),
    onMutate: () => {
      setErrorKey(null);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings-team'] });
    },
    onError: (e: Error) => {
      setErrorKey(ERROR_KEYS[e.message] ?? 'inviteErrorGeneric');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold">{t('teamTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('teamSubtitle')}</p>
      </div>

      {/* Seat counter. Rendered only once the team has loaded: before that the
          counts are 0, and "0 di 5" would be a number we have not read yet.
          For an unlimited plan it states the headcount and says there is no
          limit, instead of dividing by a total that does not exist. */}
      {data && (
        <div className="flex flex-col gap-1 rounded-xl border border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium tabular-nums">
            <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>
              {seatsAreUnlimited
                ? t('teamSeatsCounterUnlimited', { used: seatsUsed })
                : seatsOver
                  ? t('teamSeatsCounterOver', { used: seatsUsed, limit: seatLimit })
                  : t('teamSeatsCounter', { used: seatsUsed, limit: seatLimit })}
            </span>
          </div>
          <p className="text-xs text-muted-foreground tabular-nums">
            {freeViewers > 0 && !seatsAreUnlimited
              ? t('teamSeatsFreeViewers', { free: freeViewers, used: viewersInUse })
              : t('teamSeatsBreakdown', { members: membersCount, invites: invitesCount })}
          </p>
          {seatsOver && (
            <p className="text-xs text-muted-foreground tabular-nums">
              {t('teamSeatsOver', { limit: seatLimit })}
            </p>
          )}
        </div>
      )}

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
        <>
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">{t('teamColUser')}</th>
                <th className="px-4 py-3 text-left">{t('teamColEmail')}</th>
                <th className="px-4 py-3 text-left">{t('teamColRole')}</th>
                <th className="px-4 py-3 text-left">{t('teamColJoined')}</th>
                <th className="px-4 py-3 text-left">{t('teamColActions')}</th>
              </tr>
            </thead>
            <tbody>
              {data.members.map((m) => {
                const isSelf = !!me && m.userId === me.id;
                const targetIsOwner = m.role === 'owner';
                // Mirrors the server's rules exactly, so the UI never offers a
                // control the route would refuse. The server is still the
                // authority — this only decides what is worth showing.
                const reasonKey = !isManager
                  ? 'memberManagerOnly'
                  : isSelf
                    ? 'memberSelfDisabled'
                    : targetIsOwner && !isOwner
                      ? 'memberOwnerOnly'
                      : null;
                const locked = reasonKey !== null;
                const busy = changeRole.isPending || removeMember.isPending;

                return (
                  <tr key={m.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <UserCircle2 className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">{m.name ?? m.email.split('@')[0]}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{m.email}</td>
                    <td className="px-4 py-3">
                      {locked ? (
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${ROLE_BADGE[m.role] ?? ROLE_BADGE.member}`}
                          title={t(reasonKey as 'memberManagerOnly')}
                        >
                          {t(`role${m.role.charAt(0).toUpperCase()}${m.role.slice(1)}` as 'roleOwner')}
                        </span>
                      ) : (
                        <Select
                          value={m.role}
                          disabled={busy}
                          onValueChange={(v) =>
                            changeRole.mutate({ membershipId: m.id, role: v })
                          }
                        >
                          <SelectTrigger className="h-8 w-[130px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ASSIGNABLE_ROLES.filter((r) => r !== 'owner' || isOwner).map((r) => (
                              <SelectItem key={r} value={r} disabled={!canChangeRole(m.id, r)}>
                                {t(`role${r.charAt(0).toUpperCase()}${r.slice(1)}` as 'roleOwner')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDate(m.joinedAt, locale)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => removeMember.mutate(m.id)}
                        disabled={locked || busy}
                        title={reasonKey ? t(reasonKey as 'memberManagerOnly') : t('memberRemoveTooltip')}
                        className="inline-flex items-center gap-1 rounded-lg border border-danger/40 bg-danger/10 px-2 py-1 text-xs font-medium text-danger hover:bg-danger/20 disabled:opacity-50"
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                        {t('memberRemove')}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Same role reference as the invite form, next to the control that
            changes an existing member's role. */}
        <RoleCapabilities />
        </>
      )}

      <FormError>{memberErrorKey ? t(memberErrorKey as 'memberErrorGeneric') : null}</FormError>
      {isManager &&
        !seatsAreUnlimited &&
        !!data?.members.some((m) => m.role === 'viewer' && !canChangeRole(m.id, 'editor')) && (
          <p className="text-[11px] text-muted-foreground">
            {t('teamSeatsPromoteLocked')}{' '}
            <Link href="/settings/billing" className="font-medium underline">
              {tFeature('upgrade')}
            </Link>
          </p>
        )}

      {!isManager && <p className="text-[11px] text-muted-foreground">{t('memberManagerOnly')}</p>}

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
                  <th className="px-4 py-3 text-left">{t('teamColActions')}</th>
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
                    <td className="px-4 py-3">
                      {isManager && (
                        <button
                          type="button"
                          onClick={() => revokeInvite.mutate(inv.id)}
                          disabled={revokeInvite.isPending}
                          className="inline-flex items-center gap-1 rounded-lg border border-danger/40 bg-danger/10 px-2 py-1 text-xs font-medium text-danger hover:bg-danger/20 disabled:opacity-60"
                          title={t('inviteRevokeTooltip')}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {t('inviteRevoke')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite form. Disabled rather than hidden for a non-manager, and now
          also when the plan has no free seats left, with the reason written
          out — same choice as settings/billing's ownerOnly: a control that
          explains why it is unavailable beats one that silently is not there,
          and beats one the customer only discovers is refused by pressing it.
          The real checks stay server-side (requireManagerRole and
          checkSeatAvailability); this only decides what the UI offers, which
          is also why inviteErrorSeatLimit is still mapped below — two managers
          inviting at the same moment can still race past a count read a
          second ago. */}
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
              disabled={inviteBlockedReason !== null || invite.isPending}
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
              disabled={inviteBlockedReason !== null || invite.isPending}
              onValueChange={(v) => setRole(v as (typeof INVITABLE_ROLES)[number])}
            >
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INVITABLE_ROLES.map((r) => (
                  <SelectItem key={r} value={r} disabled={!canInviteRole(r)}>
                    {t(`role${r.charAt(0).toUpperCase()}${r.slice(1)}` as 'roleOwner')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* What each role can actually do — verified against the server
            guards (src/lib/auth/require-role.ts), right where the choice
            is made. */}
        <RoleCapabilities />

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

        {inviteBlockedReason && (
          <p className="text-[11px] text-muted-foreground">{inviteBlockedReason}</p>
        )}
        {isManager && onlyViewerSeat && role === 'viewer' && (
          <p className="text-[11px] text-muted-foreground">
            {t('teamSeatsViewerOnly')}{' '}
            <Link href="/settings/billing" className="font-medium underline">
              {tFeature('upgrade')}
            </Link>
          </p>
        )}

        <button
          type="submit"
          disabled={inviteBlockedReason !== null || invite.isPending || !email.trim()}
          title={inviteBlockedReason ?? undefined}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {invite.isPending ? t('inviteSending') : t('inviteSubmit')}
        </button>
      </form>
    </div>
  );
}
