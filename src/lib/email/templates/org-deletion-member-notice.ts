import { baseLayout } from './_layout';
import { escapeHtml } from './_escape';

interface OrgDeletionMemberNoticeParams {
  userName: string;
  userEmail: string;
  orgName: string;
  deletionDate: string;
  exportUrl: string;
  locale?: 'it' | 'en';
}

/**
 * Sent to the organization's members the moment the founder CONFIRMS a
 * request to delete it (admin panel — see startConfirmedOrganizationDeletion
 * in src/lib/gdpr/org-deletion.ts for exactly who receives it). Without this,
 * a plain member learns the company is gone the hard way — no page told them,
 * no email did either.
 */
export function orgDeletionMemberNoticeTemplate(params: OrgDeletionMemberNoticeParams): string {
  const { userName, userEmail, orgName, deletionDate, exportUrl, locale = 'it' } = params;
  const isEn = locale === 'en';
  const safeUserName = escapeHtml(userName);
  const safeOrgName = escapeHtml(orgName);

  const content = isEn ? `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#2A2520;line-height:1.3;">
      ${safeOrgName} is scheduled for deletion
    </h1>
    <p style="margin:0 0 16px;font-size:15px;color:#6B6760;">
      Hi ${safeUserName}, the request to delete
      <strong style="color:#2A2520;">${safeOrgName}</strong> has been confirmed. Unless
      it is cancelled, the organization and all of its data will be permanently deleted on
      <strong style="color:#2A2520;">${deletionDate}</strong>.
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#6B6760;">
      You can still use the organization and export its data until that date.
      Only an owner of the organization can cancel the deletion, from within Anlyra.
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:24px;">
      <tr>
        <td style="text-align:center;">
          <a href="${exportUrl}" style="display:inline-block;padding:10px 20px;font-size:14px;color:#5B6F4E;font-weight:600;text-decoration:underline;">
            Export the organization's data
          </a>
        </td>
      </tr>
    </table>
  ` : `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#2A2520;line-height:1.3;">
      ${safeOrgName} sarà cancellata
    </h1>
    <p style="margin:0 0 16px;font-size:15px;color:#6B6760;">
      Ciao ${safeUserName}, la richiesta di cancellare
      <strong style="color:#2A2520;">${safeOrgName}</strong> è stata confermata. Se non
      viene annullata, l'azienda e tutti i suoi dati saranno cancellati
      definitivamente il <strong style="color:#2A2520;">${deletionDate}</strong>.
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#6B6760;">
      Fino ad allora puoi continuare a usare l'azienda ed esportarne i dati.
      Solo un proprietario dell'azienda può annullare la cancellazione, da dentro Anlyra.
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:24px;">
      <tr>
        <td style="text-align:center;">
          <a href="${exportUrl}" style="display:inline-block;padding:10px 20px;font-size:14px;color:#5B6F4E;font-weight:600;text-decoration:underline;">
            Esporta i dati dell'azienda
          </a>
        </td>
      </tr>
    </table>
  `;

  return baseLayout({
    title: isEn ? `${orgName} is scheduled for deletion · Anlyra` : `${orgName} sarà cancellata · Anlyra`,
    preheader: isEn
      ? `${orgName} will be deleted on ${deletionDate} unless the request is cancelled. Export what you need before then.`
      : `${orgName} sarà cancellata il ${deletionDate} se la richiesta non viene annullata. Esporta quello che ti serve prima di allora.`,
    content,
    ctaButton: { label: isEn ? 'Export data' : 'Esporta i dati', href: exportUrl },
    userEmail,
    locale,
  });
}
