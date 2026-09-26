import { baseLayout } from './_layout';
import { escapeHtml } from './_escape';
import { COMPANY } from '@/lib/company';

interface Trial1DayParams {
  userName: string;
  userEmail: string;
  billingDate: string;
  billingAmount: string;
  planName: string;
  upgradeUrl: string;
  cancelUrl: string;
  locale?: 'it' | 'en';
}

export function trialOneDayTemplate(params: Trial1DayParams): string {
  const { userName, userEmail, billingDate, billingAmount, planName, upgradeUrl, cancelUrl, locale = 'it' } = params;
  const isEn = locale === 'en';
  const safeUserName = escapeHtml(userName);
  const safePlanName = escapeHtml(planName);

  const content = isEn ? `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#2A2520;line-height:1.3;">
      Your trial ends tomorrow
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6B6760;">
      Hi ${safeUserName}, your free trial ends tomorrow,
      <strong style="color:#2A2520;">${billingDate}</strong>. To keep using Anlyra after that, choose a plan —
      nothing is charged automatically. If you don't, your account simply switches to a read-only view; your data stays exactly as it is.
    </p>

    <!-- Plan summary -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
           style="border:1px solid #E8DFD0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
      <tr style="background-color:#5B6F4E;">
        <th colspan="2" style="padding:10px 16px;text-align:left;font-size:12px;font-weight:600;color:#F9F4EB;letter-spacing:0.05em;text-transform:uppercase;">
          Plan summary
        </th>
      </tr>
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #E8DFD0;font-size:14px;color:#6B6760;width:50%;">Plan</td>
        <td style="padding:12px 16px;border-bottom:1px solid #E8DFD0;font-size:14px;color:#2A2520;font-weight:600;text-align:right;">${safePlanName}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #E8DFD0;font-size:14px;color:#6B6760;">Price</td>
        <td style="padding:12px 16px;border-bottom:1px solid #E8DFD0;font-size:14px;color:#2A2520;font-weight:600;text-align:right;">${billingAmount}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:14px;color:#6B6760;">Trial ends</td>
        <td style="padding:12px 16px;font-size:14px;color:#2A2520;font-weight:600;text-align:right;">${billingDate}</td>
      </tr>
    </table>

    <!-- Info box -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:24px;">
      <tr>
        <td style="background-color:#F9F4EB;border:1px solid #E8DFD0;border-radius:8px;padding:12px 16px;">
          <p style="margin:0;font-size:13px;color:#2A2520;">
            <strong>Refund within 14 days for technical issues.</strong>
            <span style="color:#6B6760;"> If you hit a technical problem we can't resolve within the first 14 days after your first charge, we'll review a refund case by case.
            Write to <a href="mailto:${COMPANY.contactEmail}" style="color:#5B6F4E;">${COMPANY.contactEmail}</a>.</span>
          </p>
        </td>
      </tr>
    </table>

    <!-- Secondary CTA -->
    <p style="margin:0;font-size:13px;color:#6B6760;text-align:center;">
      Not ready to choose?
      <a href="${cancelUrl}" style="color:#5B6F4E;text-decoration:underline;">See your plan options</a> — nothing happens automatically.
    </p>
  ` : `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#2A2520;line-height:1.3;">
      La tua prova finisce domani
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6B6760;">
      Ciao ${safeUserName}, la tua prova gratuita finisce domani,
      <strong style="color:#2A2520;">${billingDate}</strong>. Per continuare a usare Anlyra scegli un piano —
      non addebitiamo nulla in automatico. Se non lo fai, l'account passa semplicemente in sola lettura: i tuoi dati restano esattamente dove sono.
    </p>

    <!-- Riepilogo piano -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
           style="border:1px solid #E8DFD0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
      <tr style="background-color:#5B6F4E;">
        <th colspan="2" style="padding:10px 16px;text-align:left;font-size:12px;font-weight:600;color:#F9F4EB;letter-spacing:0.05em;text-transform:uppercase;">
          Riepilogo piano
        </th>
      </tr>
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #E8DFD0;font-size:14px;color:#6B6760;width:50%;">Piano</td>
        <td style="padding:12px 16px;border-bottom:1px solid #E8DFD0;font-size:14px;color:#2A2520;font-weight:600;text-align:right;">${safePlanName}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #E8DFD0;font-size:14px;color:#6B6760;">Prezzo</td>
        <td style="padding:12px 16px;border-bottom:1px solid #E8DFD0;font-size:14px;color:#2A2520;font-weight:600;text-align:right;">${billingAmount}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:14px;color:#6B6760;">Fine prova</td>
        <td style="padding:12px 16px;font-size:14px;color:#2A2520;font-weight:600;text-align:right;">${billingDate}</td>
      </tr>
    </table>

    <!-- Info box -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:24px;">
      <tr>
        <td style="background-color:#F9F4EB;border:1px solid #E8DFD0;border-radius:8px;padding:12px 16px;">
          <p style="margin:0;font-size:13px;color:#2A2520;">
            <strong>Rimborso entro 14 giorni per problemi tecnici.</strong>
            <span style="color:#6B6760;"> Se hai un problema tecnico che non risolviamo entro i primi 14 giorni dal primo addebito, valutiamo il rimborso caso per caso.
            Scrivi a <a href="mailto:${COMPANY.contactEmail}" style="color:#5B6F4E;">${COMPANY.contactEmail}</a>.</span>
          </p>
        </td>
      </tr>
    </table>

    <!-- Secondary CTA -->
    <p style="margin:0;font-size:13px;color:#6B6760;text-align:center;">
      Non sei pronto a scegliere?
      <a href="${cancelUrl}" style="color:#5B6F4E;text-decoration:underline;">Guarda le opzioni di piano</a> — non succede nulla in automatico.
    </p>
  `;

  return baseLayout({
    title: isEn ? `Your trial ends tomorrow · Anlyra` : `La tua prova finisce domani · Anlyra`,
    preheader: isEn
      ? `${userName}, your trial ends tomorrow. Choose a plan to keep going — your data stays safe either way.`
      : `${userName}, la tua prova finisce domani. Scegli un piano per continuare — i tuoi dati restano al sicuro in ogni caso.`,
    content,
    ctaButton: { label: isEn ? 'Continue with the plan' : 'Continua con il piano', href: upgradeUrl },
    userEmail,
    locale,
  });
}
