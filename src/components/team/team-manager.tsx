'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useSession } from '@/lib/session-store';
import { TEAM_LIMITS } from '@/lib/plans';
import { Lock, UserPlus, X } from 'lucide-react';
import { Link } from '@/i18n/navigation';

type Role = 'owner' | 'admin' | 'editor' | 'viewer';
type Status = 'active' | 'pending' | 'disabled';
type Member = { id: string; name: string; email: string; role: Role; status: Status };

const INITIAL: Member[] = [
  { id: 'u1', name: 'Maria Bianchi', email: 'maria@acme.com', role: 'owner', status: 'active' },
  { id: 'u2', name: 'Paolo Verdi', email: 'paolo@acme.com', role: 'admin', status: 'active' },
  { id: 'u3', name: 'Lucia Neri', email: 'lucia@acme.com', role: 'editor', status: 'active' },
  { id: 'u4', name: '—', email: 'new@acme.com', role: 'viewer', status: 'pending' }
];

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'editor', 'viewer'])
});
type InviteValues = z.infer<typeof inviteSchema>;

export function TeamManager() {
  const t = useTranslations('team');
  const tc = useTranslations('common');
  const plan = useSession((s) => s.plan);
  const [members, setMembers] = useState<Member[]>(INITIAL);

  const limit = TEAM_LIMITS[plan];
  const limitReached = limit !== 'unlimited' && members.length >= limit;
  const starterBlocked = plan === 'STARTER' || plan === 'FREEMIUM';

  const { register, handleSubmit, reset, setValue, watch, formState } = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', role: 'editor' }
  });

  const onInvite = (values: InviteValues) => {
    setMembers((m) => [
      ...m,
      {
        id: 'u' + Math.random().toString(36).slice(2, 8),
        name: '—',
        email: values.email,
        role: values.role,
        status: 'pending'
      }
    ]);
    reset({ email: '', role: 'editor' });
  };

  const updateRole = (id: string, role: Role) =>
    setMembers((m) => m.map((x) => (x.id === id ? { ...x, role } : x)));
  const remove = (id: string) => setMembers((m) => m.filter((x) => x.id !== id));

  if (starterBlocked) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-500">
            <Lock className="h-5 w-5" />
          </div>
          <h3 className="mt-3 font-heading text-lg font-semibold text-slate-900">
            {t('limits.starter')}
          </h3>
          <Button asChild className="mt-4">
            <Link href="/#pricing">Upgrade</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('invite')}</CardTitle>
          <CardDescription>
            {limit === 'unlimited'
              ? `${members.length} members`
              : `${members.length} / ${limit} members`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {limitReached ? (
            <div className="rounded-md border border-warning/30 bg-warning/5 p-4 text-sm text-slate-700">
              {t('limits.proLimit')}
            </div>
          ) : (
            <form onSubmit={handleSubmit(onInvite)} className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
              <div className="space-y-1.5">
                <Label htmlFor="invite-email">{tc('search')}</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder={t('invitePlaceholder')}
                  {...register('email')}
                />
                {formState.errors.email ? (
                  <p className="text-xs text-danger">{formState.errors.email.message}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label>{t('members.role')}</Label>
                <Select
                  value={watch('role')}
                  onValueChange={(v) => setValue('role', v as InviteValues['role'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">{t('roles.admin')}</SelectItem>
                    <SelectItem value="editor">{t('roles.editor')}</SelectItem>
                    <SelectItem value="viewer">{t('roles.viewer')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full md:w-auto">
                  <UserPlus className="mr-2 h-4 w-4" />
                  {t('inviteCta')}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('members.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border border-slate-200">
            <table className="w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">{t('members.name')}</th>
                  <th className="px-3 py-2 font-medium">{t('members.email')}</th>
                  <th className="px-3 py-2 font-medium">{t('members.role')}</th>
                  <th className="px-3 py-2 font-medium">{t('members.status')}</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {members.map((m) => (
                  <tr key={m.id}>
                    <td className="px-3 py-2 text-slate-900">{m.name}</td>
                    <td className="px-3 py-2 text-slate-600">{m.email}</td>
                    <td className="px-3 py-2">
                      {m.role === 'owner' ? (
                        <Badge>{t('roles.owner')}</Badge>
                      ) : (
                        <Select value={m.role} onValueChange={(v) => updateRole(m.id, v as Role)}>
                          <SelectTrigger className="h-8 w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">{t('roles.admin')}</SelectItem>
                            <SelectItem value="editor">{t('roles.editor')}</SelectItem>
                            <SelectItem value="viewer">{t('roles.viewer')}</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant={
                          m.status === 'active'
                            ? 'success'
                            : m.status === 'pending'
                            ? 'warning'
                            : 'outline'
                        }
                      >
                        {t(`status.${m.status}`)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {m.role !== 'owner' ? (
                        <Button variant="ghost" size="sm" onClick={() => remove(m.id)}>
                          <X className="mr-1 h-4 w-4" />
                          {t('remove')}
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
