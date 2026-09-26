import { baseLayout } from './_layout';
import { escapeHtml } from './_escape';

interface Trial3DaysParams {
  userName: string;
  userEmail: string;
  daysRemaining: number;
  planName: string;
  upgradeUrl: string;
  billingDate: string;
  locale?: 'it' | 'en';
}

export function trialThreeDaysTemplate(params: Trial3DaysParams): string {
  const { userName, userEmail, daysRemaining, planName, upgradeUrl, billingDate, locale = 'it' } = params;
  const isEn = locale === 'en';
  const safeUserName = escapeHtml(userName);
  const safePlanName = escapeHtml(planName);

  const content = isEn ? `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#2A2520;line-height:1.3;">
      ${daysRemaining === 1 ? '1 day left in your trial' : `${daysRemaining} days left in your trial`}
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6B6760;">
      Hi ${safeUserName}, your Anlyra free trial ends in
      <strong style="color:#2A2520;">${daysRemaining} days</strong>, on <strong style="color:#2A2520;">${billingDate}</strong>.
      To keep using Anlyra after that, choose a plan — nothing is charged automatically, and if you don't decide in time
      your account simply switches to a read-only view. Your data stays exactly as it is either way.
    </p>

    <!-- What you get with a plan -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
           style="border:1px solid #E8DFD0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
      <tr style="background-color:#5B6F4E;">
        <th style="padding:10px 16px;text-align:left;font-size:12px;font-weight:600;color:#F9F4EB;letter-spacing:0.05em;text-transform:uppercase;">
          What you get with the ${safePlanName} plan
        </th>
      </tr>
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #E8DFD0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="width:20px;color:#5B6F4E;font-weight:700;font-size:16px;">✓</td>
              <td style="padding-left:8px;font-size:14px;color:#2A2520;">All insights and data already analyzed</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #E8DFD0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="width:20px;color:#5B6F4E;font-weight:700;font-size:16px;">✓</td>
              <td style="padding-left:8px;font-size:14px;color:#2A2520;">AI Insights and Smart Alerts</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 16px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="width:20px;color:#5B6F4E;font-weight:700;font-size:16px;">✓</td>
              <td style="padding-left:8px;font-size:14px;color:#2A2520;">Custom dashboards and forecasting</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 8px;font-size:13px;color:#6B6760;text-align:center;">
      You can cancel any time from <strong>Settings → Billing</strong>. No hard feelings.
    </p>
    <p style="margin:0;font-size:13px;color:#6B6760;text-align:center;">
      Questions? Reply to this email — I read every one personally.
    </p>
  ` : `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#2A2520;line-height:1.3;">
      ${daysRemaining === 3 ? 'Mancano 3 giorni alla fine della prova' : `Mancano ${daysRemaining} giorni alla fine della prova`}
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6B6760;">
      Ciao ${safeUserName}, la tua prova gratuita di Anlyra termina tra
      <strong style="color:#2A2520;">${daysRemaining} giorni</strong>, il <strong style="color:#2A2520;">${billingDate}</strong>.
      Per continuare a usare Anlyra scegli un piano — non addebitiamo nulla in automatico, e se non decidi in tempo
      l'account passa semplicemente in sola lettura. I tuoi dati restano esattamente dove sono in ogni caso.
    </p>

    <!-- Cosa ottieni con un piano -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
           style="border:1px solid #E8DFD0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
      <tr style="background-color:#5B6F4E;">
        <th style="padding:10px 16px;text-align:left;font-size:12px;font-weight:600;color:#F9F4EB;letter-spacing:0.05em;text-transform:uppercase;">
          Cosa ottieni con il piano ${safePlanName}
        </th>
      </tr>
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #E8DFD0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="width:20px;color:#5B6F4E;font-weight:700;font-size:16px;">✓</td>
              <td style="padding-left:8px;font-size:14px;color:#2A2520;">Tutti gli insight e i dati già analizzati</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #E8DFD0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="width:20px;color:#5B6F4E;font-weight:700;font-size:16px;">✓</td>
              <td style="padding-left:8px;font-size:14px;color:#2A2520;">AI Insights e Alert Intelligenti</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 16px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="width:20px;color:#5B6F4E;font-weight:700;font-size:16px;">✓</td>
              <td style="padding-left:8px;font-size:14px;color:#2A2520;">Dashboard personalizzate e forecast</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 8px;font-size:13px;color:#6B6760;text-align:center;">
      Puoi cancellare in qualsiasi momento da <strong>Settings → Billing</strong>. Nessun giudizio.
    </p>
    <p style="margin:0;font-size:13px;color:#6B6760;text-align:center;">
      Hai domande? Rispondi a questa email — rispondo personalmente.
    </p>
  `;

  return baseLayout({
    title: isEn ? `${daysRemaining} days left in your trial · Anlyra` : `${daysRemaining} giorni alla fine della prova · Anlyra`,
    preheader: isEn
      ? `${userName}, your trial ends in ${daysRemaining} days, on ${billingDate}. Choose a plan to keep going — your data stays safe either way.`
      : `${userName}, la tua prova termina tra ${daysRemaining} giorni, il ${billingDate}. Scegli un piano per continuare — i tuoi dati restano al sicuro in ogni caso.`,
    content,
    ctaButton: { label: isEn ? `Continue with ${planName}` : `Continua con ${planName}`, href: upgradeUrl },
    userEmail,
    locale,
  });
}
