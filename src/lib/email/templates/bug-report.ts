import { baseLayout } from './_layout';
import { escapeHtml } from './_escape';

interface BugReportParams {
  description: string;
  reporterName: string | null;
  reporterEmail: string;
  organizationName: string;
  plan: string;
  credits: number;
  page: string;
  userAgent: string;
  screenResolution: string;
  occurredAt: string;
}

/**
 * No next-intl here on purpose — same reasoning as scheduledReportTemplate:
 * none of the templates in this folder are localized, and this one is
 * internal-facing (sent to COMPANY.contactEmail, never to the reporting user),
 * so there is no audience whose language it should follow anyway.
 *
 * PRIVACY: everything passed in here must already be safe to put in an email —
 * see the route's comment for what is deliberately NOT collected (financial
 * data, customer names, AI conversation content, tokens/passwords). This
 * template does not add any filtering of its own; it trusts the caller.
 */
export function bugReportTemplate(params: BugReportParams): string {
  const {
    description,
    reporterName,
    reporterEmail,
    organizationName,
    plan,
    credits,
    page,
    userAgent,
    screenResolution,
    occurredAt,
  } = params;

  const row = (label: string, value: string, isLast = false) => `
    <tr>
      <td style="padding:10px 16px;${isLast ? '' : 'border-bottom:1px solid #E8DFD0;'}font-size:13px;color:#6B6760;width:40%;">${label}</td>
      <td style="padding:10px 16px;${isLast ? '' : 'border-bottom:1px solid #E8DFD0;'}font-size:13px;color:#2A2520;font-weight:600;">${escapeHtml(value)}</td>
    </tr>`;

  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#2A2520;line-height:1.3;">
      Nuova segnalazione di problema
    </h1>
    <p style="margin:0 0 20px;font-size:14px;color:#6B6760;">
      Da ${reporterName ? `${escapeHtml(reporterName)} · ` : ''}${escapeHtml(organizationName)}
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
           style="border:1px solid #E8DFD0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
      <tr>
        <td style="padding:16px;background-color:#F9F4EB;">
          <p style="margin:0;font-size:14px;color:#2A2520;line-height:1.65;white-space:pre-wrap;">${escapeHtml(description)}</p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#6B6760;text-transform:uppercase;letter-spacing:0.03em;">
      Contesto
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
           style="border:1px solid #E8DFD0;border-radius:8px;overflow:hidden;">
      ${row('Utente', reporterEmail)}
      ${row('Organizzazione', organizationName)}
      ${row('Piano', plan)}
      ${row('Crediti residui', String(credits))}
      ${row('Pagina', page)}
      ${row('Browser', userAgent)}
      ${row('Risoluzione schermo', screenResolution)}
      ${row('Data e ora', occurredAt, true)}
    </table>
  `;

  return baseLayout({
    title: `Segnalazione — ${organizationName}`,
    content,
  });
}
