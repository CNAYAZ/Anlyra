'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { EmptyState } from '@/components/ui/state';
import { formatDate } from '@/lib/utils';
import { FeatureGate } from '@/components/feature-gate';

type AuditEntry = {
  id: string;
  when: string;
  who: string;
  action: string;
  target: string;
  ip: string;
};

const SAMPLE: AuditEntry[] = [
  { id: 'a1', when: new Date().toISOString(), who: 'maria@acme.com', action: 'login', target: 'session', ip: '93.42.18.4' },
  { id: 'a2', when: new Date(Date.now() - 1000 * 60 * 30).toISOString(), who: 'maria@acme.com', action: 'invite_member', target: 'paolo@acme.com', ip: '93.42.18.4' },
  { id: 'a3', when: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), who: 'paolo@acme.com', action: 'export_report', target: 'report_q2.pdf', ip: '5.171.22.44' },
  { id: 'a4', when: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(), who: 'system', action: 'plan_upgrade', target: 'PRO → ENTERPRISE', ip: '—' },
  { id: 'a5', when: new Date(Date.now() - 1000 * 60 * 60 * 50).toISOString(), who: 'maria@acme.com', action: 'enable_2fa', target: 'account', ip: '93.42.18.4' },
  { id: 'a6', when: new Date(Date.now() - 1000 * 60 * 60 * 80).toISOString(), who: 'lucia@acme.com', action: 'delete_dashboard', target: 'Sales Q1', ip: '46.114.10.9' }
];

export function AuditLog() {
  const t = useTranslations('security.audit');
  const tc = useTranslations('common');
  const locale = useLocale();
  const [user, setUser] = useState<string>('all');
  const [action, setAction] = useState<string>('all');
  const [query, setQuery] = useState('');

  const users = useMemo(
    () => Array.from(new Set(SAMPLE.map((e) => e.who))),
    []
  );
  const actions = useMemo(() => Array.from(new Set(SAMPLE.map((e) => e.action))), []);

  const filtered = SAMPLE.filter((e) => {
    if (user !== 'all' && e.who !== user) return false;
    if (action !== 'all' && e.action !== action) return false;
    if (query && !`${e.who} ${e.action} ${e.target}`.toLowerCase().includes(query.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <FeatureGate required="enterprise">
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
            <Input
              placeholder={tc('search')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Select value={user} onValueChange={setUser}>
              <SelectTrigger>
                <SelectValue placeholder={t('filters.user')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.all')}</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger>
                <SelectValue placeholder={t('filters.action')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.all')}</SelectItem>
                {actions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-4 overflow-hidden rounded-md border border-border">
            <table className="w-full divide-y divide-border text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">{t('columns.when')}</th>
                  <th className="px-3 py-2 font-medium">{t('columns.who')}</th>
                  <th className="px-3 py-2 font-medium">{t('columns.action')}</th>
                  <th className="px-3 py-2 font-medium">{t('columns.target')}</th>
                  <th className="px-3 py-2 font-medium">{t('columns.ip')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 bg-card">
                {filtered.map((e) => (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                      {formatDate(e.when, locale)}
                    </td>
                    <td className="px-3 py-2 text-foreground">{e.who}</td>
                    <td className="px-3 py-2 font-mono text-xs text-foreground">{e.action}</td>
                    <td className="px-3 py-2 text-foreground">{e.target}</td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{e.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 ? (
              <div className="border-t border-border bg-muted/50 p-6">
                <EmptyState title={tc('empty')} />
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </FeatureGate>
  );
}
