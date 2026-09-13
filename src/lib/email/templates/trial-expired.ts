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
      Access to the dashboard is suspended, but your data is safe.
      You can reactivate it any time.
    </p>

    <!-- Data retention info -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
           style="border:1px solid #E8DFD0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
      <tr style="background-color:#5B6F4E;">
        <th style="padding:10px 16px;text-align:left;font-size:12px;font-weight:600;color:#F9F4EB;letter-spacing:0.05em;text-transform:uppercase;">
          What happens to your data
        </th>
      </tr>
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #E8DFD0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="width:20px;color:#5B6F4E;font-weight:700;font-size:16px;">✓</td>
              <td style="padding-left:8px;font-size:14px;color:#2A2520;">
                <strong>Kept for 30 days</strong>
                <p style="margin:2px 0 0;font-size:13px;color:#6B6760;">Dashboards, insights and imported data stay available for 30 days after expiry.</p>
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
                <strong>Permanently deleted after 30 days</strong>
                <p style="margin:2px 0 0;font-size:13px;color:#6B6760;">30 days after expiry your data is permanently removed. Export it first if you want to keep it.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${exportUrl ? `
    <!-- Export CTA -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:24px;">
      <tr>
        <td style="text-align:center;">
          <a href="${exportUrl}" style="display:inline-block;padding:10px 20px;font-size:14px;color:#5B6F4E;font-weight:600;text-decoration:underline;">
            Download your data before deletion
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
      L'accesso alla dashboard è sospeso, ma i tuoi dati sono al sicuro.
      Puoi riattivarli in qualsiasi momento.
    </p>

    <!-- Data retention info -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
           style="border:1px solid #E8DFD0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
      <tr style="background-color:#5B6F4E;">
        <th style="padding:10px 16px;text-align:left;font-size:12px;font-weight:600;color:#F9F4EB;letter-spacing:0.05em;text-transform:uppercase;">
          Cosa succede ai tuoi dati
        </th>
      </tr>
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #E8DFD0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="width:20px;color:#5B6F4E;font-weight:700;font-size:16px;">✓</td>
              <td style="padding-left:8px;font-size:14px;color:#2A2520;">
                <strong>Conservati per 30 giorni</strong>
                <p style="margin:2px 0 0;font-size:13px;color:#6B6760;">Dashboard, insight e dati importati restano disponibili per 30 giorni dalla scadenza.</p>
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
                <strong>Cancellazione definitiva dopo 30 giorni</strong>
                <p style="margin:2px 0 0;font-size:13px;color:#6B6760;">Dopo 30 giorni dalla scadenza i dati vengono rimossi permanentemente. Esportali prima se vuoi tenerli.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${exportUrl ? `
    <!-- Export CTA -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:24px;">
      <tr>
        <td style="text-align:center;">
          <a href="${exportUrl}" style="display:inline-block;padding:10px 20px;font-size:14px;color:#5B6F4E;font-weight:600;text-decoration:underline;">
            Scarica i tuoi dati prima della cancellazione
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
      ? `${userName}, your trial ended on ${expiredAt}. Your data is kept for 30 days.`
      : `${userName}, la tua prova è scaduta il ${expiredAt}. I tuoi dati sono conservati per 30 giorni.`,
    content,
    ctaButton: { label: isEn ? 'Reactivate now' : 'Riattiva ora', href: reactivateUrl },
    userEmail,
    locale,
  });
}
