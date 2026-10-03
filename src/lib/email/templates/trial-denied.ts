import { baseLayout } from './_layout';
import { escapeHtml } from './_escape';

interface TrialDeniedParams {
  userName: string;
  userEmail: string;
  planName: string;
  /** The amount charged at once, already formatted with the currency. */
  amount: string;
  /** 'card': the card had already had a trial; 'vat': the VAT number had. */
  reason: 'card' | 'vat' | 'company';
  manageUrl: string;
  locale?: 'it' | 'en';
}

/**
 * The trial did not start because the card (or the VAT number) had already had
 * one, and the subscription was charged at once (founder's decision: the card
 * is recognised only after it has been entered; the customer is told by email
 * and on screen). Sent from the Stripe webhook (src/lib/billing/trial-start.ts).
 */
export function trialDeniedTemplate(params: TrialDeniedParams): string {
  const { userName, userEmail, planName, amount, reason, manageUrl, locale = 'it' } = params;
  const safeUserName = escapeHtml(userName);
  const safePlan = escapeHtml(planName);
  const safeAmount = escapeHtml(amount);
  const isEn = locale === 'en';

  const why = isEn
    ? reason === 'card'
      ? 'the card you entered has already had a free trial of Anlyra'
      : "your company's VAT number has already had a free trial of Anlyra"
    : reason === 'card'
      ? 'la carta che hai inserito ha già usato una prova gratuita di Anlyra'
      : 'la partita IVA della tua azienda ha già usato una prova gratuita di Anlyra';

  const content = isEn
    ? `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#2A2520;line-height:1.3;">
      Your subscription started without a trial
    </h1>
    <p style="margin:0 0 16px;font-size:15px;color:#6B6760;">
      Hi ${safeUserName}, ${why}: as stated in the box you ticked before entering the card, the trial did not start.
      Your <strong style="color:#2A2520;">${safePlan}</strong> subscription started at once and
      <strong style="color:#2A2520;">${safeAmount}</strong> was charged to your card.
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#6B6760;">
      If you think this is a mistake, reply to this email: a person will review the decision.
    </p>`
    : `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#2A2520;line-height:1.3;">
      Il tuo abbonamento è partito senza prova
    </h1>
    <p style="margin:0 0 16px;font-size:15px;color:#6B6760;">
      Ciao ${safeUserName}, ${why}: come diceva la casella che hai spuntato prima di inserire la carta, la prova non è partita.
      L'abbonamento al piano <strong style="color:#2A2520;">${safePlan}</strong> è partito subito e sulla tua carta sono stati addebitati
      <strong style="color:#2A2520;">${safeAmount}</strong>.
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#6B6760;">
      Se pensi che sia un errore, rispondi a questa email: la decisione verrà rivista da una persona.
    </p>`;

  return baseLayout({
    title: isEn ? 'Subscription started without a trial' : 'Abbonamento partito senza prova',
    preheader: isEn ? `${amount} was charged at once.` : `Sono stati addebitati subito ${amount}.`,
    content,
    ctaButton: { label: isEn ? 'Manage the subscription' : "Gestisci l'abbonamento", href: manageUrl },
    userEmail,
    locale,
  });
}
