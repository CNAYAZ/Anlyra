import { baseLayout } from './_layout';
import { escapeHtml } from './_escape';

interface OrgDeletionMemberCancelledParams {
  userName: string;
  userEmail: string;
  orgName: string;
  locale?: 'it' | 'en';
}

/**
 * Sent to every OTHER member who received orgDeletionMemberNoticeTemplate,
 * when the deletion request is cancelled — same audience, so the alarm this
 * app pushed to them actively is also lifted actively, not only in the
 * banner (which only reaches someone who opens the app again). See the
 * report for why this one was added and the notice's own reasoning.
 */
export function orgDeletionMemberCancelledTemplate(params: OrgDeletionMemberCancelledParams): string {
  const { userName, userEmail, orgName, locale = 'it' } = params;
  const isEn = locale === 'en';
  const safeUserName = escapeHtml(userName);
  const safeOrgName = escapeHtml(orgName);

  const content = isEn ? `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#2A2520;line-height:1.3;">
      ${safeOrgName} is no longer scheduled for deletion
    </h1>
    <p style="margin:0 0 16px;font-size:15px;color:#6B6760;">
      Hi ${safeUserName}, good news: the request to delete
      <strong style="color:#2A2520;">${safeOrgName}</strong> has been cancelled.
      The organization and its data are safe — there is nothing you need to do.
    </p>
  ` : `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#2A2520;line-height:1.3;">
      ${safeOrgName} non sarà più cancellata
    </h1>
    <p style="margin:0 0 16px;font-size:15px;color:#6B6760;">
      Ciao ${safeUserName}, buone notizie: la richiesta di cancellazione di
      <strong style="color:#2A2520;">${safeOrgName}</strong> è stata annullata.
      L'azienda e i suoi dati sono al sicuro — non devi fare nulla.
    </p>
  `;

  return baseLayout({
    title: isEn ? `${orgName} is safe — deletion cancelled · Anlyra` : `${orgName} è al sicuro — cancellazione annullata · Anlyra`,
    preheader: isEn
      ? `The request to delete ${orgName} has been cancelled. Nothing further is needed.`
      : `La richiesta di cancellazione di ${orgName} è stata annullata. Non serve fare nulla.`,
    content,
    userEmail,
    locale,
  });
}
