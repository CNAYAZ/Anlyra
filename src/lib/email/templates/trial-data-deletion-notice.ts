import { baseLayout } from './_layout';
import { escapeHtml } from './_escape';

interface TrialDataDeletionNoticeParams {
  userName: string;
  userEmail: string;
  orgName: string;
  /** Already formatted in the recipient's language, Europe/Rome. */
  deletionDate: string;
  exportUrl: string;
  billingUrl: string;
  /** 'never_activated': a company that never had access (no card, or the first payment failed). */
  kind?: 'trial' | 'never_activated';
  locale?: 'it' | 'en';
}

/**
 * Sent to the owners and admins of an organization that never became a
 * customer, 30 days (at least) before its data is deleted — 12 months after
 * the trial ended (founder's rule; see src/lib/cron/trial-data-retention.ts).
 * Says the date, and the two ways to keep the data: export it, or choose a
 * plan (which cancels the deletion).
 */
export function trialDataDeletionNoticeTemplate(params: TrialDataDeletionNoticeParams): string {
  const { userName, userEmail, orgName, deletionDate, exportUrl, billingUrl, kind = 'trial', locale = 'it' } = params;
  const never = kind === 'never_activated';
  const isEn = locale === 'en';
  const safeUserName = escapeHtml(userName);
  const safeOrgName = escapeHtml(orgName);
  const safeDate = escapeHtml(deletionDate);

  const content = isEn ? `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#2A2520;line-height:1.3;">
      The data of ${safeOrgName} will be deleted on ${safeDate}
    </h1>
    <p style="margin:0 0 16px;font-size:15px;color:#6B6760;">
      Hi ${safeUserName}, ${never
        ? `the company <strong style="color:#2A2520;">${safeOrgName}</strong> was created almost a year ago
      and was never activated: no card was entered, or the first payment did not go through. The data
      of a company that never had access to Anlyra is not kept forever: on`
        : `the free trial of <strong style="color:#2A2520;">${safeOrgName}</strong>
      ended almost a year ago and no plan was chosen. The data of a trial that never
      became a subscription is not kept forever: on`}
      <strong style="color:#2A2520;">${safeDate}</strong> the company and all of its data
      will be permanently deleted. Your personal account is not deleted.
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#6B6760;">
      Until then you can export the data, or choose a plan: with a plan the data stays
      and nothing is deleted.
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:24px;">
      <tr>
        <td style="text-align:center;">
          <a href="${exportUrl}" style="display:inline-block;padding:10px 20px;font-size:14px;color:#5B6F4E;font-weight:600;text-decoration:underline;">
            Export the data
          </a>
        </td>
      </tr>
    </table>
  ` : `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#2A2520;line-height:1.3;">
      I dati di ${safeOrgName} saranno cancellati il ${safeDate}
    </h1>
    <p style="margin:0 0 16px;font-size:15px;color:#6B6760;">
      Ciao ${safeUserName}, ${never
        ? `l'azienda <strong style="color:#2A2520;">${safeOrgName}</strong> è stata creata quasi un anno fa
      e non è mai stata attivata: la carta non è stata inserita, oppure il primo pagamento non è riuscito.
      I dati di un'azienda che non ha mai avuto accesso ad Anlyra non restano per sempre: il`
        : `la prova gratuita di <strong style="color:#2A2520;">${safeOrgName}</strong>
      è finita quasi un anno fa e non è stato scelto nessun piano. I dati di una prova
      che non è diventata un abbonamento non restano per sempre: il`}
      <strong style="color:#2A2520;">${safeDate}</strong> l'azienda e tutti i suoi dati
      saranno cancellati definitivamente. Il tuo account personale non viene cancellato.
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#6B6760;">
      Fino ad allora puoi esportare i dati, oppure scegliere un piano: con un piano i dati
      restano e non viene cancellato nulla.
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:24px;">
      <tr>
        <td style="text-align:center;">
          <a href="${exportUrl}" style="display:inline-block;padding:10px 20px;font-size:14px;color:#5B6F4E;font-weight:600;text-decoration:underline;">
            Esporta i dati
          </a>
        </td>
      </tr>
    </table>
  `;

  return baseLayout({
    title: isEn
      ? `The data of ${orgName} will be deleted on ${deletionDate} · Anlyra`
      : `I dati di ${orgName} saranno cancellati il ${deletionDate} · Anlyra`,
    preheader: isEn
      ? `Export the data or choose a plan before ${deletionDate}.`
      : `Esporta i dati o scegli un piano prima del ${deletionDate}.`,
    content,
    ctaButton: { label: isEn ? 'Choose a plan' : 'Scegli un piano', href: billingUrl },
    userEmail,
    locale,
  });
}
