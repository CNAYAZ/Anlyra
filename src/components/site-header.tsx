'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Sparkles } from 'lucide-react';

export function SiteHeader() {
  const t = useTranslations();
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-white">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="font-heading text-lg font-bold text-primary">
            {t('common.appName')}
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
          <a href="#features" className="hover:text-slate-900">{t('nav.features')}</a>
          <a href="#how" className="hover:text-slate-900">{t('nav.howItWorks')}</a>
          <a href="#pricing" className="hover:text-slate-900">{t('nav.pricing')}</a>
          <a href="#testimonials" className="hover:text-slate-900">{t('nav.testimonials')}</a>
        </nav>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link href="/login" className="hidden text-sm text-slate-600 hover:text-slate-900 sm:inline">
            {t('common.login')}
          </Link>
          <Button asChild size="sm">
            <Link href="/onboarding">{t('common.freeStart')}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
