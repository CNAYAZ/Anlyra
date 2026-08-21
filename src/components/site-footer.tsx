import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Sparkles } from 'lucide-react';

export function SiteFooter() {
  const t = useTranslations('landing.footer');
  const tc = useTranslations('common');

  // Only real, existing destinations: no page under src/app/[locale]/ backs
  // /about, /blog, /careers, /help, /status or a real changelog — those were
  // removed rather than left as dead links. "Contattaci" survives as a
  // mailto (no page needed for that).
  const groups = [
    {
      title: t('product'),
      links: [
        { href: '/#features', label: t('features') },
        { href: '/pricing', label: t('pricing') },
      ],
    },
    {
      title: t('legal'),
      links: [
        { href: '/legal/privacy', label: t('privacy') },
        { href: '/legal/terms', label: t('terms') },
        { href: '/legal/cookies', label: t('cookies') },
      ],
    },
  ];

  const contactEmail = t('contactEmail');
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background">
      <div className="container py-12">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-white">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="font-heading text-lg font-bold text-primary">
                {tc('appName')}
              </span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">{tc('tagline')}</p>
          </div>

          {groups.map((g) => (
            <div key={g.title}>
              <h4 className="font-heading text-sm font-semibold text-foreground">{g.title}</h4>
              <ul className="mt-3 space-y-2">
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground">
                      {l.label}
                    </Link>
                  </li>
                ))}
                {/* mailto isn't an internal route, so it stays a plain <a>
                    rather than going through next-intl's Link. */}
                {g.title === t('legal') && (
                  <li>
                    <a href={`mailto:${contactEmail}`} className="text-sm text-muted-foreground hover:text-foreground">
                      {t('contact')}
                    </a>
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-sm text-muted-foreground md:flex-row md:items-center">
          <p>© {year} {tc('appName')}. {t('rights')}</p>
          <p>Made with Claude</p>
        </div>

        {/* Company identification (D.Lgs. 70/2003): discreet — small, muted
            text below the copyright bar — but readable, not hidden. */}
        <div className="mt-4 space-y-0.5 text-xs text-muted-foreground/80">
          <p>{t('companyLegalName')}</p>
          <p>{t('companyAddress')}</p>
          <p>
            {t('companyVat')} ·{' '}
            <a href={`mailto:${contactEmail}`} className="hover:text-foreground hover:underline">
              {contactEmail}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
