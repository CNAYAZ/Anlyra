import { baseLayout } from './_layout';
import { COMPANY } from '@/lib/company';

interface Trial1DayParams {
  userName: string;
  userEmail: string;
  billingDate: string;
  billingAmount: string;
  planName: string;
  upgradeUrl: string;
  cancelUrl: string;
}

export function trialOneDayTemplate(params: Trial1DayParams): string {
  const { userName, userEmail, billingDate, billingAmount, planName, upgradeUrl, cancelUrl } = params;

  const content = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#2A2520;line-height:1.3;">
      Domani inizia il tuo piano ${planName}
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6B6760;">
      Ciao ${userName}, la prova gratuita scade oggi. Domani
      <strong style="color:#2A2520;">${billingDate}</strong> verrà addebitato
      <strong style="color:#2A2520;">${billingAmount}</strong> per il piano <strong style="color:#2A2520;">${planName}</strong>.
    </p>

    <!-- Billing summary -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
           style="border:1px solid #E8DFD0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
      <tr style="background-color:#5B6F4E;">
        <th colspan="2" style="padding:10px 16px;text-align:left;font-size:12px;font-weight:600;color:#F9F4EB;letter-spacing:0.05em;text-transform:uppercase;">
          Riepilogo addebito
        </th>
      </tr>
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #E8DFD0;font-size:14px;color:#6B6760;width:50%;">Piano</td>
        <td style="padding:12px 16px;border-bottom:1px solid #E8DFD0;font-size:14px;color:#2A2520;font-weight:600;text-align:right;">${planName}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #E8DFD0;font-size:14px;color:#6B6760;">Importo</td>
        <td style="padding:12px 16px;border-bottom:1px solid #E8DFD0;font-size:14px;color:#2A2520;font-weight:600;text-align:right;">${billingAmount}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:14px;color:#6B6760;">Data addebito</td>
        <td style="padding:12px 16px;font-size:14px;color:#2A2520;font-weight:600;text-align:right;">${billingDate}</td>
      </tr>
    </table>

    <!-- Info box -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:24px;">
      <tr>
        <td style="background-color:#F9F4EB;border:1px solid #E8DFD0;border-radius:8px;padding:12px 16px;">
          <p style="margin:0;font-size:13px;color:#2A2520;">
            <strong>Garanzia 14 giorni.</strong>
            <span style="color:#6B6760;"> Se dopo il primo addebito non sei soddisfatto, rimborsiamo senza domande.
            Scrivi a <a href="mailto:${COMPANY.contactEmail}" style="color:#5B6F4E;">${COMPANY.contactEmail}</a>.</span>
          </p>
        </td>
      </tr>
    </table>

    <!-- Secondary CTA -->
    <p style="margin:0;font-size:13px;color:#6B6760;text-align:center;">
      Non vuoi continuare?
      <a href="${cancelUrl}" style="color:#5B6F4E;text-decoration:underline;">Cancella la prova prima che inizi l'addebito</a>.
    </p>
  `;

  return baseLayout({
    title: `Domani inizia il tuo piano · Anlyra`,
    preheader: `${userName}, domani ${billingDate} verrà addebitato ${billingAmount} per ${planName}. Puoi cancellare fino ad allora.`,
    content,
    ctaButton: { label: 'Continua con il piano', href: upgradeUrl },
    userEmail,
  });
}
