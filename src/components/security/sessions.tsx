'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Monitor, Smartphone } from 'lucide-react';
import { formatDate } from '@/lib/utils';

type Session = {
  id: string;
  device: string;
  browser: string;
  location: string;
  lastActive: string;
  ip: string;
  current?: boolean;
  mobile?: boolean;
};

const INITIAL: Session[] = [
  {
    id: 's1',
    device: 'MacBook Pro',
    browser: 'Chrome 124',
    location: 'Milan, IT',
    lastActive: new Date().toISOString(),
    ip: '93.42.18.4',
    current: true
  },
  {
    id: 's2',
    device: 'iPhone 15',
    browser: 'Safari Mobile',
    location: 'Rome, IT',
    lastActive: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    ip: '5.171.22.44',
    mobile: true
  },
  {
    id: 's3',
    device: 'Windows Workstation',
    browser: 'Edge 122',
    location: 'Berlin, DE',
    lastActive: new Date(Date.now() - 1000 * 60 * 60 * 80).toISOString(),
    ip: '46.114.10.9'
  }
];

export function Sessions() {
  const t = useTranslations('security.sessions');
  const locale = useLocale();
  const [sessions, setSessions] = useState<Session[]>(INITIAL);

  const revoke = (id: string) => setSessions((s) => s.filter((x) => x.id !== id));
  const revokeAll = () => setSessions((s) => s.filter((x) => x.current));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </div>
          <Button variant="secondary" size="sm" onClick={revokeAll}>
            {t('revokeAll')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border/50">
          {sessions.map((s) => {
            const Icon = s.mobile ? Smartphone : Monitor;
            return (
              <li key={s.id} className="flex items-center justify-between gap-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-md bg-muted text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {s.device} · {s.browser}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s.location} · {s.ip} · {t('lastActive')}: {formatDate(s.lastActive, locale)}
                    </p>
                  </div>
                </div>
                {s.current ? (
                  <Badge variant="success">{t('current')}</Badge>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => revoke(s.id)}>
                    {t('revoke')}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
