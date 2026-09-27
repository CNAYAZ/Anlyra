import { baseLayout } from './_layout';
import { escapeHtml } from './_escape';

interface OrgDeletionApprovalRejectedParams {
  userName: string;
  userEmail: string;
  orgName: string;
  contactEmail: string;
  locale?: 'it' | 'en';
}

/**
 * Sent to whoever requested a company's deletion when the founder REJECTS
 * the request from the admin panel. Nothing was deleted or blocked while it
 * waited, so the message is short: it was not confirmed, the company stays,
 * and where to write for questions.
 */
export function orgDeletionApprovalRejectedTemplate(params: OrgDeletionApprovalRejectedParams): string {
  const { userName, userEmail, orgName, contactEmail, locale = 'it' } = params;
  const isEn = locale === 'en';
  const safeUserName = escapeHtml(userName);
  const safeOrgName = escapeHtml(orgName);
  const safeContact = escapeHtml(contactEmail);

  const content = isEn ? `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#2A2520;line-height:1.3;">
      Your request to delete ${safeOrgName} was not confirmed
    </h1>
    <p style="margin:0 0 16px;font-size:15px;color:#6B6760;">
      Hi ${safeUserName}, the request to delete
      <strong style="color:#2A2520;">${safeOrgName}</strong> was not confirmed.
      The company and all of its data stay as they are: nothing has been deleted.
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#6B6760;">
      For any questions, write to ${safeContact}.
    </p>
  ` : `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#2A2520;line-height:1.3;">
      La richiesta di cancellare ${safeOrgName} non è stata confermata
    </h1>
    <p style="margin:0 0 16px;font-size:15px;color:#6B6760;">
      Ciao ${safeUserName}, la richiesta di cancellare
      <strong style="color:#2A2520;">${safeOrgName}</strong> non è stata confermata.
      L'azienda e tutti i suoi dati restano come sono: non è stato cancellato nulla.
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#6B6760;">
      Per qualsiasi domanda scrivi a ${safeContact}.
    </p>
  `;

  return baseLayout({
    title: isEn
      ? `Request to delete ${orgName} not confirmed · Anlyra`
      : `Richiesta di cancellazione di ${orgName} non confermata · Anlyra`,
    preheader: isEn
      ? `${orgName} was not deleted. The company and its data stay as they are.`
      : `${orgName} non è stata cancellata. L'azienda e i suoi dati restano come sono.`,
    content,
    userEmail,
    locale,
  });
}
