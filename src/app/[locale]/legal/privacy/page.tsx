import { setRequestLocale, getTranslations } from 'next-intl/server';
import { LegalPage, type LegalSection } from '@/components/legal/legal-page';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'legal' });
  return { title: t('privacy.title') };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'legal' });

  return (
    <LegalPage
      title={t('privacy.title')}
      subtitle={t('privacy.subtitle')}
      lastRevised={t('privacy.lastRevised')}
      disclaimer={t('common.disclaimer')}
      disclaimerLabel={t('common.disclaimerLabel')}
      tocTitle={t('common.tocTitle')}
      readAlso={t('common.readAlso')}
      sections={t.raw('privacy.sections') as LegalSection[]}
      crossLinks={[
        { href: '/legal/terms', label: t('nav.terms') },
        { href: '/legal/cookies', label: t('nav.cookies') },
      ]}
    />
  );
}
