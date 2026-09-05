import { baseLayout } from './_layout';
import { escapeHtml } from './_escape';

interface SubscriptionCanceledParams {
  userName: string;
  userEmail: string;
  planName: string;
  accessUntil: string;
  reactivateUrl: string;
  exportUrl: string;
  feedbackUrl?: string;
}

export function subscriptionCanceledTemplate(params: SubscriptionCanceledParams): string {
  const { userName, userEmail, planName, accessUntil, reactivateUrl, exportUrl, feedbackUrl } = params;
  const safeUserName = escapeHtml(userName);
  const safePlanName = escapeHtml(planName);

  const content = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#2A2520;line-height:1.3;">
      Account cancellato — grazie per averci provato
    </h1>
    <p style="margin:0 0 16px;font-size:15px;color:#6B6760;">
      Ciao ${safeUserName}, la cancellazione del piano <strong style="color:#2A2520;">${safePlanName}</strong> è confermata.
      Grazie per aver scelto Anlyra.
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#6B6760;">
      Hai accesso completo fino al <strong style="color:#2A2520;">${accessUntil}</strong>.
      Dopo quella data l'accesso viene sospeso e i tuoi dati conservati per altri 30 giorni.
    </p>

    <!-- Timeline -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
           style="border:1px solid #E8DFD0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
      <tr style="background-color:#5B6F4E;">
        <th style="padding:10px 16px;text-align:left;font-size:12px;font-weight:600;color:#F9F4EB;letter-spacing:0.05em;text-transform:uppercase;">
          Cosa succede ora
        </th>
      </tr>
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #E8DFD0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="width:20px;color:#5B6F4E;font-weight:700;font-size:16px;">✓</td>
              <td style="padding-left:8px;font-size:14px;color:#2A2520;">
                <strong>Accesso completo fino al ${accessUntil}</strong>
                <p style="margin:2px 0 0;font-size:13px;color:#6B6760;">Nessuna interruzione del servizio prima della fine del periodo pagato.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #E8DFD0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="width:20px;color:#6B6760;font-size:16px;">→</td>
              <td style="padding-left:8px;font-size:14px;color:#2A2520;">
                <strong>Dati conservati 30 giorni dopo la scadenza</strong>
                <p style="margin:2px 0 0;font-size:13px;color:#6B6760;">Hai tempo per esportarli prima della cancellazione definitiva.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 16px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="width:20px;color:#6B6760;font-size:16px;">→</td>
              <td style="padding-left:8px;font-size:14px;color:#2A2520;">
                <strong>Nessun addebito futuro</strong>
                <p style="margin:2px 0 0;font-size:13px;color:#6B6760;">La cancellazione è definitiva. Non riceverai altri addebiti.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Export link -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:24px;">
      <tr>
        <td style="text-align:center;">
          <a href="${exportUrl}" style="display:inline-block;padding:10px 20px;font-size:14px;color:#5B6F4E;font-weight:600;text-decoration:underline;">
            Esporta i tuoi dati
          </a>
        </td>
      </tr>
    </table>

    ${feedbackUrl ? `
    <!-- Feedback survey -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:24px;">
      <tr>
        <td style="background-color:#F9F4EB;border:1px solid #E8DFD0;border-radius:8px;padding:14px 16px;">
          <p style="margin:0 0 6px;font-size:14px;color:#2A2520;font-weight:600;">Hai 30 secondi?</p>
          <p style="margin:0;font-size:13px;color:#6B6760;">
            <a href="${feedbackUrl}" style="color:#5B6F4E;text-decoration:underline;">Dimmi perché hai cancellato</a>
            — un click, nessuna registrazione. Il tuo feedback migliora Anlyra per tutti.
          </p>
        </td>
      </tr>
    </table>
    ` : ''}

    <p style="margin:0;font-size:13px;color:#6B6760;text-align:center;">
      Hai cambiato idea?
      <a href="${reactivateUrl}" style="color:#5B6F4E;text-decoration:underline;">Riattiva il tuo abbonamento</a> in qualsiasi momento.
    </p>
  `;

  return baseLayout({
    title: 'Account cancellato — grazie per averci provato · Anlyra',
    preheader: `${userName}, la cancellazione di ${planName} è confermata. Accesso garantito fino al ${accessUntil}.`,
    content,
    ctaButton: { label: 'Riattiva abbonamento', href: reactivateUrl },
    userEmail,
  });
}
