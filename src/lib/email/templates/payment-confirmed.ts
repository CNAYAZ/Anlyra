import { baseLayout } from './_layout';
import { escapeHtml } from './_escape';
import { COMPANY } from '@/lib/company';

interface PaymentConfirmedParams {
  userName: string;
  userEmail: string;
  planName: string;
  amount: string;
  currency: string;
  nextBillingDate: string;
  invoiceUrl: string;
}

export function paymentConfirmedTemplate(params: PaymentConfirmedParams): string {
  const { userName, userEmail, planName, amount, currency, nextBillingDate, invoiceUrl } = params;
  const safeUserName = escapeHtml(userName);
  // planName here traces back to Stripe's invoice line description
  // (webhooks/stripe/route.ts: `invoice.lines.data[0]?.description`), founder
  // -configured product/price text rather than something a customer types —
  // but escaping costs nothing on a plain plan name, and it stops depending
  // on that staying true.
  const safePlanName = escapeHtml(planName);

  const content = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#2A2520;line-height:1.3;">
      Pagamento confermato
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6B6760;">
      Grazie ${safeUserName}! Il tuo pagamento è stato elaborato con successo.
    </p>

    <!-- Payment summary table -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
           style="border:1px solid #E8DFD0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
      <tr style="background-color:#5B6F4E;">
        <th colspan="2" style="padding:10px 16px;text-align:left;font-size:12px;font-weight:600;color:#F9F4EB;letter-spacing:0.05em;text-transform:uppercase;">
          Riepilogo acquisto
        </th>
      </tr>
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #E8DFD0;font-size:14px;color:#6B6760;width:50%;">Piano</td>
        <td style="padding:12px 16px;border-bottom:1px solid #E8DFD0;font-size:14px;color:#2A2520;font-weight:600;text-align:right;">${safePlanName}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #E8DFD0;font-size:14px;color:#6B6760;">Importo addebitato</td>
        <td style="padding:12px 16px;border-bottom:1px solid #E8DFD0;font-size:14px;color:#2A2520;font-weight:600;text-align:right;">${amount} ${currency}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:14px;color:#6B6760;">Prossimo rinnovo</td>
        <td style="padding:12px 16px;font-size:14px;color:#2A2520;font-weight:600;text-align:right;">${nextBillingDate}</td>
      </tr>
    </table>

    <!-- Money-back guarantee -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:24px;">
      <tr>
        <td style="background-color:#F9F4EB;border:1px solid #E8DFD0;border-radius:8px;padding:12px 16px;">
          <p style="margin:0;font-size:13px;color:#2A2520;">
            <strong>Garanzia 14 giorni.</strong>
            <span style="color:#6B6760;"> Se non sei soddisfatto entro i primi 14 giorni dal primo pagamento, rimborsiamo senza domande. Scrivi a <a href="mailto:${COMPANY.contactEmail}" style="color:#5B6F4E;">${COMPANY.contactEmail}</a>.</span>
          </p>
        </td>
      </tr>
    </table>

    <!-- Manage link -->
    <p style="margin:0;font-size:13px;color:#6B6760;text-align:center;">
      Puoi gestire la tua sottoscrizione in qualsiasi momento dalla
      <a href="/settings/billing" style="color:#5B6F4E;text-decoration:underline;">pagina di fatturazione</a>.
    </p>
  `;

  return baseLayout({
    title: 'Pagamento confermato — Anlyra',
    preheader: `Pagamento di ${amount} ${currency} per ${planName} confermato. Prossimo rinnovo: ${nextBillingDate}.`,
    content,
    ctaButton: { label: 'Vedi ricevuta', href: invoiceUrl },
    userEmail,
  });
}
