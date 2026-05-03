import { setRequestLocale, getTranslations } from 'next-intl/server';
import { LegalPage } from '@/components/legal/legal-page';

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'legal.privacy' });
  return { title: t('title') };
}

export default async function PrivacyPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'legal.privacy' });

  return (
    <LegalPage title={t('title')} lastUpdated={t('lastUpdated')}>
      <p>
        Pro Business Analyzer (“Pro”, “we”, “us”) takes your privacy seriously. This Privacy
        Policy explains what personal data we collect, how we use it, the legal basis for
        processing under the EU General Data Protection Regulation (GDPR) and your rights as a
        data subject.
      </p>

      <h2>1. Data Controller</h2>
      <p>
        The data controller is Pro Business Analyzer, with registered office at Via Esempio 1,
        20100 Milan, Italy. You can contact us at privacy@pro-analyzer.example.
      </p>

      <h2>2. Data we collect</h2>
      <ul>
        <li>Account data: name, email, password hash, language and locale.</li>
        <li>Organization data: company name, industry, country, currency, members and roles.</li>
        <li>
          Usage data: pages viewed, features used, audit logs, IP address, browser and device.
        </li>
        <li>Content: data you upload (CSV, Excel) and AI prompts you submit.</li>
        <li>Billing data: handled by Stripe; we store only customer and subscription IDs.</li>
      </ul>

      <h2>3. How we use your data</h2>
      <ul>
        <li>To provide and improve the service (Art. 6(1)(b) GDPR — contract performance).</li>
        <li>To send transactional emails and product updates (Art. 6(1)(b) and (f)).</li>
        <li>To comply with legal obligations such as tax and anti-fraud (Art. 6(1)(c)).</li>
        <li>To analyze aggregated usage with your consent (Art. 6(1)(a)).</li>
      </ul>

      <h2>4. AI processing</h2>
      <p>
        When you use AI features, the data you submit is sent to Anthropic (Claude API) for
        processing. Anthropic is a sub-processor and acts under a Data Processing Agreement.
        We do not use your inputs or outputs to train third-party models.
      </p>

      <h2>5. Data sharing</h2>
      <p>
        We share data only with sub-processors required to operate the service: Vercel
        (hosting), Supabase (database), Upstash (cache), Resend (email), Stripe (payments),
        Anthropic (AI). All sub-processors are bound by GDPR-compliant agreements.
      </p>

      <h2>6. Data retention</h2>
      <p>
        We retain account data while your subscription is active and for 12 months after
        cancellation, unless legally required to keep it longer. You can request deletion at
        any time.
      </p>

      <h2>7. Your rights</h2>
      <ul>
        <li>Access, rectify or erase your personal data.</li>
        <li>Restrict or object to processing.</li>
        <li>Receive a portable copy of your data.</li>
        <li>Withdraw consent for non-essential processing.</li>
        <li>Lodge a complaint with the Italian Data Protection Authority (Garante).</li>
      </ul>

      <h2>8. International transfers</h2>
      <p>
        When data is transferred outside the European Economic Area, we rely on Standard
        Contractual Clauses approved by the European Commission and assess each provider for
        equivalent safeguards.
      </p>

      <h2>9. Security</h2>
      <p>
        We use TLS encryption in transit, AES-256 at rest, role-based access control, optional
        2FA, audit logging on Enterprise plans and regular security reviews.
      </p>

      <h2>10. Changes to this policy</h2>
      <p>
        We will notify you in-app and via email of any material change at least 30 days before
        it takes effect.
      </p>

      <h2>11. Contact</h2>
      <p>
        For privacy questions or to exercise your rights, contact our Data Protection Officer
        at dpo@pro-analyzer.example.
      </p>
    </LegalPage>
  );
}
