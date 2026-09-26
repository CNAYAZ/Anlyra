import { setRequestLocale, getTranslations } from 'next-intl/server';
import { PricingPage, type FaqItem } from '@/components/pricing/pricing-page';
import { productSchema, breadcrumbSchema } from '@/lib/seo/json-ld';
import { PLANS } from '@/lib/billing/plans';
import { planLimitBullets } from '@/lib/billing/plan-bullets';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://anlyra.com').trim();

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pricing' });
  return { title: t('hero.title') };
}

export default async function PricingRoute({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'pricing' });

  // People, AI credits and companies are read from the price list
  // (PLANS[...].limits) — the same values the server enforces — so these
  // bullets can never drift from the real limits. The rest is i18n text.
  const limitBullets = (planId: 'PRO' | 'ADVANCED' | 'ENTERPRISE') =>
    planLimitBullets(planId, (key, values) => t(key as 'seats', values));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            productSchema({
              name: 'Pro',
              description:
                `Analytics AI per piccole imprese. ${PLANS.PRO.limits.aiCredits} crediti AI al mese, ${PLANS.PRO.limits.users} persona con accesso completo più ${PLANS.PRO.limits.freeViewers} in sola lettura.`,
              priceMonthly: 49,
              priceYearly: 490,
            }),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            productSchema({
              name: 'Avanzato',
              description:
                `Analytics AI per team in crescita. ${PLANS.ADVANCED.limits.aiCredits} crediti AI al mese, fino a ${PLANS.ADVANCED.limits.users} persone.`,
              priceMonthly: 149,
              priceYearly: 1490,
              isPopular: true,
            }),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: 'Home', url: `${SITE_URL}/${locale}` },
              { name: 'Pricing', url: `${SITE_URL}/${locale}/pricing` },
            ]),
          ),
        }}
      />
      <PricingPage
      heroTitle={t('hero.title')}
      heroSubtitle={t('hero.subtitle')}
      toggleMonthly={t('toggle.monthly')}
      toggleAnnual={t('toggle.annual')}
      discountBadge={t('toggle.discountBadge')}
      vatNote={t('vatNote')}
      proName={t('plans.pro.name')}
      proTagline={t('plans.pro.tagline')}
      proPriceMonthly={t('plans.pro.priceMonthly')}
      proPriceAnnual={t('plans.pro.priceAnnual')}
      proBilledMonthly={t('plans.pro.billedMonthly')}
      proBilledAnnual={t('plans.pro.billedAnnual')}
      proBilledNote={t('plans.pro.billedNote')}
      proFeatures={[...limitBullets('PRO'), ...(t.raw('plans.pro.features') as string[])]}
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
      advancedFeatures={[...limitBullets('ADVANCED'), ...(t.raw('plans.advanced.features') as string[])]}
      advancedCta={t('plans.advanced.cta')}
      advancedFooterNote={t('plans.advanced.footerNote')}
      enterpriseName={t('plans.enterprise.name')}
      enterpriseTagline={t('plans.enterprise.tagline')}
      enterpriseTaglineSub={t('plans.enterprise.taglineSub')}
      enterprisePriceLabel={t('plans.enterprise.priceLabel')}
      enterpriseFeaturesPrefix={t('plans.enterprise.featuresPrefix')}
      enterpriseFeatures={[...limitBullets('ENTERPRISE'), ...(t.raw('plans.enterprise.features') as string[])]}
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
    </>
  );
}
