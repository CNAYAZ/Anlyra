import { setRequestLocale, getTranslations } from 'next-intl/server';
import { LegalPage } from '@/components/legal/legal-page';

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'legal.cookies' });
  return { title: t('title') };
}

export default async function CookiesPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'legal.cookies' });

  return (
    <LegalPage title={t('title')} lastUpdated={t('lastUpdated')}>
      <p>
        Pro uses cookies and similar technologies to provide the service, remember your
        preferences and understand how the platform is used. You can manage your choices at
        any time from the cookie banner.
      </p>

      <h2>What are cookies?</h2>
      <p>
        Cookies are small text files stored on your device when you visit a website. We also
        use localStorage and similar browser storage.
      </p>

      <h2>Categories we use</h2>
      <ul>
        <li>
          <strong>Necessary</strong> — required for authentication, security and core
          functionality. These cannot be disabled.
        </li>
        <li>
          <strong>Analytics</strong> — help us understand which features are used and where
          users encounter friction.
        </li>
        <li>
          <strong>Marketing</strong> — used to measure campaign effectiveness and personalize
          offers. Off by default.
        </li>
      </ul>

      <h2>Managing your preferences</h2>
      <p>
        Use the cookie banner to accept all, reject non-essential cookies, or customize per
        category. You can change your choice at any time from the footer of the site.
      </p>

      <h2>Third-party cookies</h2>
      <p>
        Some features rely on third parties (Stripe for billing, optional analytics providers).
        These may set their own cookies subject to their respective policies.
      </p>

      <h2>Contact</h2>
      <p>For questions about cookies, contact privacy@pro-analyzer.example.</p>
    </LegalPage>
  );
}
