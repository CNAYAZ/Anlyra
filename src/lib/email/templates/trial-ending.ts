import { baseLayout } from './_layout';
import { escapeHtml } from './_escape';

interface TrialEndingParams {
  userName: string;
  userEmail: string;
  planName: string;
  /** The day the trial ends and the first charge is made, already formatted. */
  endDate: string;
  /** The first charge, already formatted with the currency. */
  amount: string;
  /** Absolute billing page URL, where the subscription can be cancelled (Stripe portal). */
  manageUrl: string;
  locale?: 'it' | 'en';
}

/**
 * Three days before the end of a trial run by Stripe (founder's decision): the
 * date and the amount of the first charge, and how to cancel before it. Sent
 * from the Stripe webhook (customer.subscription.trial_will_end).
 */
export function trialEndingTemplate(params: TrialEndingParams): string {
  const { userName, userEmail, planName, endDate, amount, manageUrl, locale = 'it' } = params;
  const safeUserName = escapeHtml(userName);
  const safePlan = escapeHtml(planName);
  const safeDate = escapeHtml(endDate);
  const safeAmount = escapeHtml(amount);
  const isEn = locale === 'en';

  const content = isEn
    ? `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#2A2520;line-height:1.3;">
      Your free trial ends on ${safeDate}
    </h1>
    <p style="margin:0 0 16px;font-size:15px;color:#6B6760;">
      Hi ${safeUserName}, your free trial of Anlyra ends on <strong style="color:#2A2520;">${safeDate}</strong>.
      On that day your <strong style="color:#2A2520;">${safePlan}</strong> subscription starts and
      <strong style="color:#2A2520;">${safeAmount}</strong> will be charged to your card.
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#6B6760;">
      If you do not want to continue, cancel before that day from the billing page: nothing will be charged.
    </p>`
    : `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#2A2520;line-height:1.3;">
      La tua prova gratuita finisce il ${safeDate}
    </h1>
    <p style="margin:0 0 16px;font-size:15px;color:#6B6760;">
      Ciao ${safeUserName}, la tua prova gratuita di Anlyra finisce il <strong style="color:#2A2520;">${safeDate}</strong>.
      Quel giorno parte l'abbonamento al piano <strong style="color:#2A2520;">${safePlan}</strong> e sulla tua carta vengono addebitati
      <strong style="color:#2A2520;">${safeAmount}</strong>.
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#6B6760;">
      Se non vuoi continuare, disdici prima di quel giorno dalla pagina dell'abbonamento: non ti verrà addebitato nulla.
    </p>`;

  return baseLayout({
    title: isEn ? `Your trial ends on ${endDate}` : `La prova finisce il ${endDate}`,
    preheader: isEn ? `On ${endDate} ${amount} will be charged.` : `Il ${endDate} verranno addebitati ${amount}.`,
    content,
    ctaButton: { label: isEn ? 'Manage the subscription' : "Gestisci l'abbonamento", href: manageUrl },
    userEmail,
    locale,
  });
}
