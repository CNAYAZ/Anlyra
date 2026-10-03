import { baseLayout } from './_layout';
import { escapeHtml } from './_escape';

interface PaymentActionRequiredParams {
  userName: string;
  userEmail: string;
  /** Already formatted, with the currency: "49,00 EUR". */
  amount: string;
  /** Stripe's hosted invoice page, where the customer confirms the payment (3D Secure). */
  confirmUrl: string;
  locale?: 'it' | 'en';
}

/**
 * A payment that needs the customer's confirmation (3D Secure) — typically the
 * first charge at the end of the trial. Sent from the Stripe webhook
 * (invoice.payment_action_required).
 */
export function paymentActionRequiredTemplate(params: PaymentActionRequiredParams): string {
  const { userName, userEmail, amount, confirmUrl, locale = 'it' } = params;
  const safeUserName = escapeHtml(userName);
  const safeAmount = escapeHtml(amount);
  const isEn = locale === 'en';

  const content = isEn
    ? `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#2A2520;line-height:1.3;">
      Your bank asks you to confirm the payment
    </h1>
    <p style="margin:0 0 16px;font-size:15px;color:#6B6760;">
      Hi ${safeUserName}, your bank needs you to confirm the payment of <strong style="color:#2A2520;">${safeAmount}</strong> for your Anlyra subscription.
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#6B6760;">
      Until it is confirmed the payment is not complete and access to Anlyra is limited.
    </p>`
    : `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#2A2520;line-height:1.3;">
      La tua banca chiede di confermare il pagamento
    </h1>
    <p style="margin:0 0 16px;font-size:15px;color:#6B6760;">
      Ciao ${safeUserName}, la tua banca chiede che tu confermi il pagamento di <strong style="color:#2A2520;">${safeAmount}</strong> per l'abbonamento ad Anlyra.
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#6B6760;">
      Finché non lo confermi il pagamento non è completo e l'accesso ad Anlyra è limitato.
    </p>`;

  return baseLayout({
    title: isEn ? 'Confirm your payment' : 'Conferma il pagamento',
    preheader: isEn ? 'Your bank needs you to confirm the payment.' : 'La tua banca chiede di confermare il pagamento.',
    content,
    ctaButton: { label: isEn ? 'Confirm the payment' : 'Conferma il pagamento', href: confirmUrl },
    userEmail,
    locale,
  });
}
