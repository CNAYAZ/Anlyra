import { baseLayout } from './_layout';
import { escapeHtml } from './_escape';

interface OrgDeletionApprovalReceivedParams {
  userName: string;
  userEmail: string;
  orgName: string;
  /** See orgDeletionApprovalFounderTemplate: true when the request was filed because its only member is leaving. */
  automatic: boolean;
  locale?: 'it' | 'en';
}

/**
 * Sent to the person whose request to delete a company is now waiting for
 * the founder's confirmation. Says the two things they need to know: nothing
 * has changed yet, and someone will get in touch to confirm it.
 */
export function orgDeletionApprovalReceivedTemplate(params: OrgDeletionApprovalReceivedParams): string {
  const { userName, userEmail, orgName, automatic, locale = 'it' } = params;
  const isEn = locale === 'en';
  const safeUserName = escapeHtml(userName);
  const safeOrgName = escapeHtml(orgName);

  const content = isEn ? `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#2A2520;line-height:1.3;">
      We received your request to delete ${safeOrgName}
    </h1>
    <p style="margin:0 0 16px;font-size:15px;color:#6B6760;">
      Hi ${safeUserName}, ${
        automatic
          ? `you are the only person in <strong style="color:#2A2520;">${safeOrgName}</strong> and you asked to delete your account, so a request to delete the company too has been sent to Anlyra.`
          : `your request to delete <strong style="color:#2A2520;">${safeOrgName}</strong> has reached Anlyra.`
      }
      We will contact you to confirm it.
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#6B6760;">
      ${
        automatic
          ? 'Until it is confirmed the company and its data stay as they are. The subscription will not renew: it stays active until the end of the period already paid for.'
          : 'Until it is confirmed nothing changes: the company, its data and its subscription stay exactly as they are, and you can withdraw the request from Settings › Security.'
      }
    </p>
  ` : `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#2A2520;line-height:1.3;">
      Abbiamo ricevuto la richiesta di cancellare ${safeOrgName}
    </h1>
    <p style="margin:0 0 16px;font-size:15px;color:#6B6760;">
      Ciao ${safeUserName}, ${
        automatic
          ? `sei l'unica persona in <strong style="color:#2A2520;">${safeOrgName}</strong> e hai chiesto di cancellare il tuo account, quindi ad Anlyra è arrivata anche la richiesta di cancellare l'azienda.`
          : `la tua richiesta di cancellare <strong style="color:#2A2520;">${safeOrgName}</strong> è arrivata ad Anlyra.`
      }
      Ti contatteremo per confermarla.
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#6B6760;">
      ${
        automatic
          ? "Finché non è confermata, l'azienda e i suoi dati restano come sono. L'abbonamento non si rinnoverà: resta attivo fino alla fine del periodo già pagato."
          : "Finché non è confermata non cambia nulla: l'azienda, i dati e l'abbonamento restano esattamente come sono, e puoi ritirare la richiesta da Impostazioni › Sicurezza."
      }
    </p>
  `;

  return baseLayout({
    title: isEn
      ? `Request to delete ${orgName} received · Anlyra`
      : `Richiesta di cancellazione di ${orgName} ricevuta · Anlyra`,
    preheader: isEn
      ? `Your request to delete ${orgName} is waiting for confirmation. We will contact you.`
      : `La richiesta di cancellare ${orgName} è in attesa di conferma. Ti contatteremo.`,
    content,
    userEmail,
    locale,
  });
}
