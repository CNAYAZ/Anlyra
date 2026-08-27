import { setRequestLocale, getTranslations } from 'next-intl/server';
import { LegalPage, type LegalSection } from '@/components/legal/legal-page';
import { modelsInUse } from '@/lib/ai/models';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'legal' });
  return { title: t('privacy.title') };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'legal' });

  // The disclosure names every model that processes customer data, derived from
  // the per-surface map (@/lib/ai/models) rather than hardcoded: before, the
  // page named a single model because there WAS only one, and pointing one
  // surface at a different model would have left a published legal page quietly
  // stating something untrue. The i18n string keeps its single {model}
  // placeholder — the list is joined here, so neither locale file changes and
  // there is no missing-ICU-argument risk.
  const aiModels = modelsInUse().join(', ');

  return (
    <LegalPage
      title={t('privacy.title')}
      subtitle={t('privacy.subtitle')}
      lastRevised={t('privacy.lastRevised')}
      disclaimer={t('common.disclaimer')}
      disclaimerLabel={t('common.disclaimerLabel')}
      aiModelNote={t('common.aiModelNote', { model: aiModels })}
      aiModelNoteLabel={t('common.aiModelNoteLabel')}
      aiDataFlowNote={t('common.aiDataFlowNote')}
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
