import { setRequestLocale, getTranslations } from 'next-intl/server';
import { LegalPage } from '@/components/legal/legal-page';

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'legal.terms' });
  return { title: t('title') };
}

export default async function TermsPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'legal.terms' });

  return (
    <LegalPage title={t('title')} lastUpdated={t('lastUpdated')}>
      <p>
        These Terms of Service govern your access to and use of Pro Business Analyzer. By
        creating an account, you agree to be bound by these Terms.
      </p>

      <h2>1. The Service</h2>
      <p>
        Pro is a SaaS platform for business analytics, including data import, AI insights,
        custom dashboards and reports. We may update or discontinue features with reasonable
        notice.
      </p>

      <h2>2. Accounts</h2>
      <p>
        You are responsible for safeguarding your credentials and for all activity under your
        account. Keep your contact information current.
      </p>

      <h2>3. Plans and billing</h2>
      <ul>
        <li>Freemium: 2 imports/month, 3 AI credits, basic finance only.</li>
        <li>Starter: €29/month, 1 user, 1 organization, 5 imports, 5 AI credits.</li>
        <li>Pro: €79/month, 10 users, 5 organizations, unlimited imports, 100 AI credits.</li>
        <li>
          Enterprise: €199/month, unlimited users and organizations, 500 AI credits, AI Agent,
          real-time collaboration, audit log, 2FA enforcement.
        </li>
        <li>Extra credits never expire: 50 for €9, 200 for €29, 500 for €59.</li>
      </ul>

      <h2>4. Acceptable use</h2>
      <p>
        You may not (a) violate any law, (b) infringe third-party rights, (c) attempt to gain
        unauthorized access, (d) reverse engineer the service, or (e) use the service to send
        spam or illegal content.
      </p>

      <h2>5. Customer data</h2>
      <p>
        You retain all rights to data you upload. You grant us a worldwide, non-exclusive
        licence to host, process and display that data solely to provide the service.
      </p>

      <h2>6. AI outputs</h2>
      <p>
        AI insights are generated based on your data and may contain inaccuracies. You are
        responsible for verifying outputs before relying on them for decisions.
      </p>

      <h2>7. Term and termination</h2>
      <p>
        Either party may terminate the agreement at any time. On termination, your data is
        retained for 30 days for export, then permanently deleted.
      </p>

      <h2>8. Warranty disclaimer</h2>
      <p>
        The service is provided “as is”. To the maximum extent permitted by law, we disclaim
        all implied warranties, including merchantability and fitness for a particular purpose.
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        Our aggregate liability is limited to the fees paid to us in the 12 months preceding
        the event giving rise to the claim.
      </p>

      <h2>10. Governing law</h2>
      <p>
        These Terms are governed by the laws of Italy. Disputes will be resolved exclusively
        by the courts of Milan, except where applicable consumer protection law provides
        otherwise.
      </p>

      <h2>11. Contact</h2>
      <p>For questions about these Terms, contact legal@pro-analyzer.example.</p>
    </LegalPage>
  );
}
