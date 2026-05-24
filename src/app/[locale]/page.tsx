import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import {
  LandingPage,
  type FeatureItem,
  type HowItWorksStep,
  type ProblemPoint,
  type TestimonialItem,
} from '@/components/landing/landing-page';
import { softwareApplicationSchema } from '@/lib/seo/json-ld';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'landing' });
  return {
    title: t('hero.title'),
    description: t('hero.subtitle'),
  };
}

export default async function RootPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Auth gate: check for the pro_session cookie directly.
  // getSession() always falls back to DEMO_SESSION, so we must inspect the cookie.
  // If a valid cookie is present the user is authenticated → go to dashboard overview.
  // If missing or unparseable → show the public landing page.
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('pro_session')?.value;
  let isAuthenticated = false;
  if (sessionCookie) {
    try {
      const parsed = JSON.parse(sessionCookie);
      isAuthenticated = Boolean(parsed?.userId);
    } catch {
      // malformed cookie → treat as unauthenticated
    }
  }

  if (isAuthenticated) {
    redirect('/overview');
  }

  const t = await getTranslations({ locale, namespace: 'landing' });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplicationSchema()),
        }}
      />
      <LandingPage
      heroTitle={t('hero.title')}
      heroSubtitle={t('hero.subtitle')}
      heroCta1={t('hero.cta1')}
      heroCta2={t('hero.cta2')}
      heroDisclaimer={t('hero.disclaimer')}
      heroPreviewCaption={t('hero.previewCaption')}
      problemTitle={t('problem.title')}
      problemPoints={t.raw('problem.points') as ProblemPoint[]}
      featuresTitle={t('features.title')}
      featureItems={t.raw('features.items') as FeatureItem[]}
      howItWorksTitle={t('howItWorks.title')}
      howItWorksSteps={t.raw('howItWorks.steps') as HowItWorksStep[]}
      trustTitle={t('trust.title')}
      trustParagraph={t('trust.paragraph')}
      trustPromises={t.raw('trust.promises') as string[]}
      testimonialsTitle={t('testimonials.title')}
      testimonialItems={t.raw('testimonials.items') as TestimonialItem[]}
      finalCtaTitle={t('finalCta.title')}
      finalCtaSubtitle={t('finalCta.subtitle')}
      finalCtaPrimary={t('finalCta.ctaPrimary')}
      finalCtaSecondary={t('finalCta.ctaSecondary')}
      />
    </>
  );
}
