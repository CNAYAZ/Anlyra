import { baseLayout } from './_layout';
import { escapeHtml } from './_escape';
import { COMPANY } from '@/lib/company';

interface WelcomeParams {
  userName: string;
  userEmail: string;
  loginUrl: string;
  locale?: 'it' | 'en';
}

export function welcomeTemplate(params: WelcomeParams): string {
  const { userName, userEmail, loginUrl, locale = 'it' } = params;
  const safeUserName = escapeHtml(userName);
  const isEn = locale === 'en';

  const content = isEn ? `
    <h1 style="margin:0 0 20px;font-size:24px;font-weight:700;color:#2A2520;line-height:1.3;">
      Welcome to Anlyra, ${safeUserName}!
    </h1>
    <p style="margin:0 0 16px;color:#2A2520;">
      Your account has been created. You're ready to turn your company's data into smart decisions.
    </p>
    <p style="margin:0 0 24px;color:#2A2520;">
      Here's what you can do right away:
    </p>

    <!-- Benefits list -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:8px;">
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #E8DFD0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="width:32px;vertical-align:top;padding-top:2px;">
                <span style="display:inline-block;width:20px;height:20px;background-color:#5B6F4E;border-radius:50%;text-align:center;line-height:20px;color:#FFFFFF;font-size:11px;font-weight:700;">✓</span>
              </td>
              <td style="padding-left:8px;">
                <strong style="color:#2A2520;font-size:14px;">A dashboard built for you</strong>
                <p style="margin:2px 0 0;font-size:13px;color:#6B6760;">Set up widgets and metrics to track what matters for your business.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #E8DFD0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="width:32px;vertical-align:top;padding-top:2px;">
                <span style="display:inline-block;width:20px;height:20px;background-color:#5B6F4E;border-radius:50%;text-align:center;line-height:20px;color:#FFFFFF;font-size:11px;font-weight:700;">✓</span>
              </td>
              <td style="padding-left:8px;">
                <strong style="color:#2A2520;font-size:14px;">Weekly AI insights</strong>
                <p style="margin:2px 0 0;font-size:13px;color:#6B6760;">Smart analysis of your organization's financial and operational trends.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="width:32px;vertical-align:top;padding-top:2px;">
                <span style="display:inline-block;width:20px;height:20px;background-color:#5B6F4E;border-radius:50%;text-align:center;line-height:20px;color:#FFFFFF;font-size:11px;font-weight:700;">✓</span>
              </td>
              <td style="padding-left:8px;">
                <strong style="color:#2A2520;font-size:14px;">Privacy taken seriously</strong>
                <p style="margin:2px 0 0;font-size:13px;color:#6B6760;">Your data stays yours. No sharing with third parties, ever.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin:24px 0 0;font-size:14px;color:#6B6760;">
      Questions? Reply to this email or write to us at <a href="mailto:${COMPANY.contactEmail}" style="color:#5B6F4E;">${COMPANY.contactEmail}</a>.
    </p>
  ` : `
    <h1 style="margin:0 0 20px;font-size:24px;font-weight:700;color:#2A2520;line-height:1.3;">
      Benvenuto su Anlyra, ${safeUserName}!
    </h1>
    <p style="margin:0 0 16px;color:#2A2520;">
      Il tuo account è stato creato con successo. Sei pronto a trasformare i dati della tua azienda in decisioni intelligenti.
    </p>
    <p style="margin:0 0 24px;color:#2A2520;">
      Ecco cosa puoi fare da subito:
    </p>

    <!-- Benefits list -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:8px;">
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #E8DFD0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="width:32px;vertical-align:top;padding-top:2px;">
                <span style="display:inline-block;width:20px;height:20px;background-color:#5B6F4E;border-radius:50%;text-align:center;line-height:20px;color:#FFFFFF;font-size:11px;font-weight:700;">✓</span>
              </td>
              <td style="padding-left:8px;">
                <strong style="color:#2A2520;font-size:14px;">Dashboard personalizzata</strong>
                <p style="margin:2px 0 0;font-size:13px;color:#6B6760;">Configura widget e metriche per monitorare ciò che conta per la tua azienda.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #E8DFD0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="width:32px;vertical-align:top;padding-top:2px;">
                <span style="display:inline-block;width:20px;height:20px;background-color:#5B6F4E;border-radius:50%;text-align:center;line-height:20px;color:#FFFFFF;font-size:11px;font-weight:700;">✓</span>
              </td>
              <td style="padding-left:8px;">
                <strong style="color:#2A2520;font-size:14px;">AI insights settimanali</strong>
                <p style="margin:2px 0 0;font-size:13px;color:#6B6760;">Analisi intelligenti sui trend finanziari e operativi della tua organizzazione.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="width:32px;vertical-align:top;padding-top:2px;">
                <span style="display:inline-block;width:20px;height:20px;background-color:#5B6F4E;border-radius:50%;text-align:center;line-height:20px;color:#FFFFFF;font-size:11px;font-weight:700;">✓</span>
              </td>
              <td style="padding-left:8px;">
                <strong style="color:#2A2520;font-size:14px;">Privacy seria</strong>
                <p style="margin:2px 0 0;font-size:13px;color:#6B6760;">I tuoi dati rimangono tuoi. Nessuna condivisione con terze parti, mai.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin:24px 0 0;font-size:14px;color:#6B6760;">
      Hai domande? Rispondi a questa email o scrivici a <a href="mailto:${COMPANY.contactEmail}" style="color:#5B6F4E;">${COMPANY.contactEmail}</a>.
    </p>
  `;

  return baseLayout({
    title: isEn ? `Welcome to Anlyra, ${userName}!` : `Benvenuto su Anlyra, ${userName}!`,
    preheader: isEn
      ? `Your Anlyra account is ready. Sign in and start exploring your data.`
      : `Il tuo account Anlyra è pronto. Accedi e inizia a esplorare i tuoi dati.`,
    content,
    ctaButton: { label: isEn ? 'Go to your dashboard' : 'Accedi alla tua dashboard', href: loginUrl },
    userEmail,
    locale,
  });
}
