import { baseLayout } from './_layout';
import { escapeHtml } from './_escape';

interface ScheduledReportParams {
  organizationName: string;
  reportTitle: string;
  /** "settimanale" | "mensile" — already localized by the caller, matching the style of trial-check.ts's fmtDate/plan labels. */
  scheduleLabel: string;
  periodLabel: string;
  dashboardUrl: string;
  userEmail?: string;
}

/**
 * No next-intl here on purpose: none of the other 9 templates in this folder
 * are localized either (verified — every one hardcodes Italian HTML strings).
 * A single new template pulling from it.json/en.json would be an inconsistent
 * one-off; matching the existing convention is the more honest choice until a
 * real decision is made to localize the whole email layer.
 */
export function scheduledReportTemplate(params: ScheduledReportParams): string {
  const { organizationName, reportTitle, scheduleLabel, periodLabel, dashboardUrl, userEmail } = params;
  const safeOrganizationName = escapeHtml(organizationName);
  // reportTitle is free text a user typed when creating the scheduled report
  // (zod max(120), no character filter — src/app/api/reports/route.ts).
  const safeReportTitle = escapeHtml(reportTitle);

  const content = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#2A2520;line-height:1.3;">
      Il tuo report ${scheduleLabel} è pronto
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6B6760;">
      Ecco "${safeReportTitle}" per ${safeOrganizationName}, in allegato a questa email in formato PDF.
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
           style="border:1px solid #E8DFD0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #E8DFD0;font-size:14px;color:#6B6760;width:40%;">Report</td>
        <td style="padding:12px 16px;border-bottom:1px solid #E8DFD0;font-size:14px;color:#2A2520;font-weight:600;text-align:right;">${safeReportTitle}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:14px;color:#6B6760;">Periodo</td>
        <td style="padding:12px 16px;font-size:14px;color:#2A2520;font-weight:600;text-align:right;">${periodLabel}</td>
      </tr>
    </table>

    <p style="margin:0;font-size:13px;color:#6B6760;">
      Questo report è generato automaticamente dai dati reali della tua organizzazione.
      Puoi gestire la programmazione dei report dalla tua dashboard.
    </p>
  `;

  return baseLayout({
    title: `Il tuo report ${scheduleLabel} — Anlyra`,
    preheader: `"${reportTitle}" per ${organizationName} è pronto, in allegato in PDF.`,
    content,
    ctaButton: { label: 'Vai alla dashboard', href: dashboardUrl },
    userEmail,
  });
}
