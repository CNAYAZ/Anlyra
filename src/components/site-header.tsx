'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Sparkles } from 'lucide-react';

export function SiteHeader() {
  const t = useTranslations();
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-white">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="font-heading text-lg font-bold text-primary">
            {t('common.appName')}
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <Link href="/#features" className="hover:text-foreground">{t('nav.features')}</Link>
          <Link href="/#how" className="hover:text-foreground">{t('nav.howItWorks')}</Link>
          <Link href="/pricing" className="hover:text-foreground">{t('nav.pricing')}</Link>
        </nav>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link href="/login" className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline">
            {t('common.login')}
          </Link>
          <Button asChild variant="primary" size="sm">
            <Link href="/login?signup=pro">{t('landing.hero.cta1')}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
