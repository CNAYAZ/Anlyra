import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Sparkles } from 'lucide-react';

export function SiteFooter() {
  const t = useTranslations('landing.footer');
  const tc = useTranslations('common');

  const groups = [
    {
      title: t('product'),
      links: [
        { href: '/#features', label: t('features') },
        { href: '/#pricing', label: t('pricing') },
        { href: '/#how', label: tc('appName') + ' Changelog', display: t('changelog') }
      ]
    },
    {
      title: t('company'),
      links: [
        { href: '/about', label: t('about') },
        { href: '/blog', label: t('blog') },
        { href: '/careers', label: t('careers') }
      ]
    },
    {
      title: t('legal'),
      links: [
        { href: '/legal/privacy', label: t('privacy') },
        { href: '/legal/terms', label: t('terms') },
        { href: '/legal/cookies', label: t('cookies') }
      ]
    },
    {
      title: t('support'),
      links: [
        { href: '/help', label: t('help') },
        { href: '/contact', label: t('contact') },
        { href: '/status', label: t('status') }
      ]
    }
  ];

  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="container py-12">
        <div className="grid gap-10 md:grid-cols-5">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-white">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="font-heading text-lg font-bold text-primary">
                {tc('appName')}
              </span>
            </Link>
            <p className="mt-3 text-sm text-slate-500">{tc('tagline')}</p>
          </div>

          {groups.map((g) => (
            <div key={g.title}>
              <h4 className="font-heading text-sm font-semibold text-slate-900">{g.title}</h4>
              <ul className="mt-3 space-y-2">
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-slate-500 hover:text-slate-900">
                      {('display' in l && l.display) || l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-slate-200 pt-6 text-sm text-slate-500 md:flex-row md:items-center">
          <p>© {year} {tc('appName')}. {t('rights')}</p>
          <p>Made with Claude</p>
        </div>
      </div>
    </footer>
  );
}
