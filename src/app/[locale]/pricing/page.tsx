import { setRequestLocale, getTranslations } from 'next-intl/server';
import { PricingPage, type FaqItem } from '@/components/pricing/pricing-page';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pricing' });
  return { title: t('hero.title') };
}

export default async function PricingRoute({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'pricing' });

  return (
    <PricingPage
      heroTitle={t('hero.title')}
      heroSubtitle={t('hero.subtitle')}
      toggleMonthly={t('toggle.monthly')}
      toggleAnnual={t('toggle.annual')}
      discountBadge={t('toggle.discountBadge')}
      proName={t('plans.pro.name')}
      proTagline={t('plans.pro.tagline')}
      proPriceMonthly={t('plans.pro.priceMonthly')}
      proPriceAnnual={t('plans.pro.priceAnnual')}
      proBilledMonthly={t('plans.pro.billedMonthly')}
      proBilledAnnual={t('plans.pro.billedAnnual')}
      proBilledNote={t('plans.pro.billedNote')}
      proFeatures={t.raw('plans.pro.features') as string[]}
      proCta={t('plans.pro.cta')}
      proFooterNote={t('plans.pro.footerNote')}
      advancedBadge={t('plans.advanced.badge')}
      advancedName={t('plans.advanced.name')}
      advancedTagline={t('plans.advanced.tagline')}
      advancedPriceMonthly={t('plans.advanced.priceMonthly')}
      advancedPriceAnnual={t('plans.advanced.priceAnnual')}
      advancedBilledMonthly={t('plans.advanced.billedMonthly')}
      advancedBilledAnnual={t('plans.advanced.billedAnnual')}
      advancedBilledNote={t('plans.advanced.billedNote')}
      advancedFeaturesPrefix={t('plans.advanced.featuresPrefix')}
      advancedFeatures={t.raw('plans.advanced.features') as string[]}
      advancedCta={t('plans.advanced.cta')}
      advancedFooterNote={t('plans.advanced.footerNote')}
      enterpriseName={t('plans.enterprise.name')}
      enterpriseTagline={t('plans.enterprise.tagline')}
      enterpriseTaglineSub={t('plans.enterprise.taglineSub')}
      enterprisePriceLabel={t('plans.enterprise.priceLabel')}
      enterpriseFeaturesPrefix={t('plans.enterprise.featuresPrefix')}
      enterpriseFeatures={t.raw('plans.enterprise.features') as string[]}
      enterpriseCta={t('plans.enterprise.cta')}
      enterpriseFooterNote={t('plans.enterprise.footerNote')}
      moneyBackTitle={t('moneyBack.title')}
      moneyBackSubtitle={t('moneyBack.subtitle')}
      demoLabel={t('demo.label')}
      demoLink={t('demo.link')}
      faqItems={t.raw('faq') as FaqItem[]}
      finalCtaTitle={t('finalCta.title')}
      finalCtaSubtitle={t('finalCta.subtitle')}
      finalCtaPrimary={t('finalCta.ctaPrimary')}
    />
  );
}
