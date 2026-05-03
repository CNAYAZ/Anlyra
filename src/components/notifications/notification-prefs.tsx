'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle, FileText, Sparkles, CreditCard } from 'lucide-react';

type ChannelKey = 'inApp' | 'email';
type TypeKey = 'alerts' | 'reports' | 'insights' | 'billing';
type Prefs = Record<TypeKey, Record<ChannelKey, boolean>>;

const TYPES: { key: TypeKey; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'alerts', icon: AlertTriangle },
  { key: 'reports', icon: FileText },
  { key: 'insights', icon: Sparkles },
  { key: 'billing', icon: CreditCard }
];

const DEFAULT: Prefs = {
  alerts: { inApp: true, email: true },
  reports: { inApp: true, email: false },
  insights: { inApp: true, email: true },
  billing: { inApp: true, email: true }
};

export function NotificationPrefs() {
  const t = useTranslations('notifications');
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT);
  const [saved, setSaved] = useState(false);

  const toggle = (type: TypeKey, channel: ChannelKey, value: boolean) => {
    setPrefs((p) => ({ ...p, [type]: { ...p[type], [channel]: value } }));
  };

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-md border border-slate-200">
          <div className="grid grid-cols-[1fr_120px_120px] bg-slate-50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            <span>Type</span>
            <span className="text-right">{t('channels.inApp')}</span>
            <span className="text-right">{t('channels.email')}</span>
          </div>
          <ul className="divide-y divide-slate-100 bg-white">
            {TYPES.map((row) => {
              const Icon = row.icon;
              return (
                <li key={row.key} className="grid grid-cols-[1fr_120px_120px] items-center px-4 py-4">
                  <div className="flex items-start gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-md bg-slate-100 text-slate-600">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {t(`types.${row.key}.title`)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {t(`types.${row.key}.description`)}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Switch
                      checked={prefs[row.key].inApp}
                      onCheckedChange={(v) => toggle(row.key, 'inApp', v)}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Switch
                      checked={prefs[row.key].email}
                      onCheckedChange={(v) => toggle(row.key, 'email', v)}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <Button onClick={save}>Save</Button>
          {saved ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" /> {t('saved')}
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
