import { setRequestLocale, getTranslations } from 'next-intl/server';
import { LegalPage, type LegalSection } from '@/components/legal/legal-page';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'legal' });
  return { title: t('terms.title') };
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'legal' });

  return (
    <LegalPage
      title={t('terms.title')}
      subtitle={t('terms.subtitle')}
      lastRevised={t('terms.lastRevised')}
      disclaimer={t('common.disclaimer')}
      disclaimerLabel={t('common.disclaimerLabel')}
      tocTitle={t('common.tocTitle')}
      readAlso={t('common.readAlso')}
      sections={t.raw('terms.sections') as LegalSection[]}
      crossLinks={[
        { href: '/legal/privacy', label: t('nav.privacy') },
        { href: '/legal/cookies', label: t('nav.cookies') },
      ]}
    />
  );
}
