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
      <strong style="color:#2A2520;">${daysRemaining} days</strong>. If you continue, your
      <strong style="color:#2A2520;">${safePlanName}</strong> plan will start on <strong style="color:#2A2520;">${billingDate}</strong>.
    </p>

    <!-- What you keep -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
           style="border:1px solid #E8DFD0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
      <tr style="background-color:#5B6F4E;">
        <th style="padding:10px 16px;text-align:left;font-size:12px;font-weight:600;color:#F9F4EB;letter-spacing:0.05em;text-transform:uppercase;">
          You keep access to everything
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
              <td style="padding-left:8px;font-size:14px;color:#2A2520;">AI Insights and automatic alerts</td>
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
      <strong style="color:#2A2520;">${daysRemaining} giorni</strong>. Se continui, il tuo piano
      <strong style="color:#2A2520;">${safePlanName}</strong> inizierà il <strong style="color:#2A2520;">${billingDate}</strong>.
    </p>

    <!-- What you keep -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
           style="border:1px solid #E8DFD0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
      <tr style="background-color:#5B6F4E;">
        <th style="padding:10px 16px;text-align:left;font-size:12px;font-weight:600;color:#F9F4EB;letter-spacing:0.05em;text-transform:uppercase;">
          Continui ad avere accesso a tutto
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
              <td style="padding-left:8px;font-size:14px;color:#2A2520;">AI Insights e alert automatici</td>
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
      ? `${userName}, your trial ends in ${daysRemaining} days. The ${planName} plan starts on ${billingDate}.`
      : `${userName}, la tua prova termina tra ${daysRemaining} giorni. Il piano ${planName} inizia il ${billingDate}.`,
    content,
    ctaButton: { label: isEn ? `Continue with ${planName}` : `Continua con ${planName}`, href: upgradeUrl },
    userEmail,
    locale,
  });
}
