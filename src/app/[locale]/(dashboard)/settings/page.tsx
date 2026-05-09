'use client';

export const dynamic = 'force-dynamic';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  User,
  Building2,
  Users,
  CreditCard,
  Shield,
  Bell,
  ChevronRight,
} from 'lucide-react';

const SECTIONS = [
  { key: 'profile', icon: User, href: '/settings/profile' },
  { key: 'organization', icon: Building2, href: '/settings/organization' },
  { key: 'team', icon: Users, href: '/settings/team' },
  { key: 'billing', icon: CreditCard, href: '/settings/billing' },
  { key: 'security', icon: Shield, href: '/settings/security' },
  { key: 'notifications', icon: Bell, href: '/settings/notifications' },
] as const;

export default function SettingsPage() {
  const t = useTranslations('settings');
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map(({ key, icon: Icon, href }) => (
          <Link
            key={key}
            href={href}
            className="card flex items-center gap-3 transition-colors hover:border-primary-accent"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-accent/10 text-primary-accent">
              <Icon className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold">{t(`section${key.charAt(0).toUpperCase()}${key.slice(1)}Title` as 'sectionProfileTitle')}</p>
              <p className="text-xs text-muted-foreground">{t(`section${key.charAt(0).toUpperCase()}${key.slice(1)}Desc` as 'sectionProfileDesc')}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}
