import { baseLayout } from './_layout';
import { escapeHtml } from './_escape';
import { COMPANY } from '@/lib/company';

interface TrialExpiredParams {
  userName: string;
  userEmail: string;
  expiredAt: string;
  reactivateUrl: string;
  exportUrl?: string;
  locale?: 'it' | 'en';
}

export function trialExpiredTemplate(params: TrialExpiredParams): string {
  const { userName, userEmail, expiredAt, reactivateUrl, exportUrl, locale = 'it' } = params;
  const isEn = locale === 'en';
  const safeUserName = escapeHtml(userName);

  const content = isEn ? `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#2A2520;line-height:1.3;">
      Your trial has ended
    </h1>
    <p style="margin:0 0 16px;font-size:15px;color:#6B6760;">
      Hi ${safeUserName}, your Anlyra free trial ended on
      <strong style="color:#2A2520;">${expiredAt}</strong>.
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#6B6760;">
      Your dashboard is now read-only, and nothing has been deleted: your data stays exactly as it is.
      Choose a plan whenever you're ready to pick up where you left off.
    </p>

    <!-- What this means -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
           style="border:1px solid #E8DFD0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
      <tr style="background-color:#5B6F4E;">
        <th style="padding:10px 16px;text-align:left;font-size:12px;font-weight:600;color:#F9F4EB;letter-spacing:0.05em;text-transform:uppercase;">
          What this means
        </th>
      </tr>
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #E8DFD0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="width:20px;color:#5B6F4E;font-weight:700;font-size:16px;">✓</td>
              <td style="padding-left:8px;font-size:14px;color:#2A2520;">
                <strong>Your data stays as it is</strong>
                <p style="margin:2px 0 0;font-size:13px;color:#6B6760;">Dashboards, insights and imported data remain exactly where they are — nothing is deleted.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 16px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="width:20px;color:#D97706;font-weight:700;font-size:16px;">!</td>
              <td style="padding-left:8px;font-size:14px;color:#2A2520;">
                <strong>Some actions are paused</strong>
                <p style="margin:2px 0 0;font-size:13px;color:#6B6760;">AI features and adding new data are paused until you choose a plan.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${exportUrl ? `
    <!-- Export link -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:24px;">
      <tr>
        <td style="text-align:center;">
          <a href="${exportUrl}" style="display:inline-block;padding:10px 20px;font-size:14px;color:#5B6F4E;font-weight:600;text-decoration:underline;">
            Download a copy of your data
          </a>
        </td>
      </tr>
    </table>
    ` : ''}

    <p style="margin:0;font-size:13px;color:#6B6760;text-align:center;">
      Questions? Write to us at <a href="mailto:${COMPANY.contactEmail}" style="color:#5B6F4E;">${COMPANY.contactEmail}</a>.
      The door is always open.
    </p>
  ` : `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#2A2520;line-height:1.3;">
      La tua prova è scaduta
    </h1>
    <p style="margin:0 0 16px;font-size:15px;color:#6B6760;">
      Ciao ${safeUserName}, la tua prova gratuita di Anlyra è terminata il
      <strong style="color:#2A2520;">${expiredAt}</strong>.
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#6B6760;">
      Il tuo account passa in sola lettura, e non abbiamo cancellato nulla: i tuoi dati restano esattamente dove sono.
      Scegli un piano quando vuoi per riprendere da dove hai lasciato.
    </p>

    <!-- Cosa cambia -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
           style="border:1px solid #E8DFD0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
      <tr style="background-color:#5B6F4E;">
        <th style="padding:10px 16px;text-align:left;font-size:12px;font-weight:600;color:#F9F4EB;letter-spacing:0.05em;text-transform:uppercase;">
          Cosa cambia
        </th>
      </tr>
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #E8DFD0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="width:20px;color:#5B6F4E;font-weight:700;font-size:16px;">✓</td>
              <td style="padding-left:8px;font-size:14px;color:#2A2520;">
                <strong>I tuoi dati restano come sono</strong>
                <p style="margin:2px 0 0;font-size:13px;color:#6B6760;">Dashboard, insight e dati importati restano esattamente dove sono: non cancelliamo nulla.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 16px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="width:20px;color:#D97706;font-weight:700;font-size:16px;">!</td>
              <td style="padding-left:8px;font-size:14px;color:#2A2520;">
                <strong>Alcune azioni sono in pausa</strong>
                <p style="margin:2px 0 0;font-size:13px;color:#6B6760;">Le funzioni AI e l'aggiunta di nuovi dati sono in pausa finché non scegli un piano.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${exportUrl ? `
    <!-- Link di esportazione -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:24px;">
      <tr>
        <td style="text-align:center;">
          <a href="${exportUrl}" style="display:inline-block;padding:10px 20px;font-size:14px;color:#5B6F4E;font-weight:600;text-decoration:underline;">
            Scarica una copia dei tuoi dati
          </a>
        </td>
      </tr>
    </table>
    ` : ''}

    <p style="margin:0;font-size:13px;color:#6B6760;text-align:center;">
      Hai domande? Scrivici a <a href="mailto:${COMPANY.contactEmail}" style="color:#5B6F4E;">${COMPANY.contactEmail}</a>.
      La porta è sempre aperta.
    </p>
  `;

  return baseLayout({
    title: isEn ? 'Your trial has ended — reactivate your account · Anlyra' : 'Prova scaduta — riattiva il tuo account · Anlyra',
    preheader: isEn
      ? `${userName}, your trial ended on ${expiredAt}. Your data is safe — choose a plan to keep going.`
      : `${userName}, la tua prova è scaduta il ${expiredAt}. I tuoi dati sono al sicuro — scegli un piano per continuare.`,
    content,
    ctaButton: { label: isEn ? 'Reactivate now' : 'Riattiva ora', href: reactivateUrl },
    userEmail,
    locale,
  });
}
