import { baseLayout } from './_layout';
import { escapeHtml } from './_escape';

interface ScheduledReportParams {
  organizationName: string;
  reportTitle: string;
  /** "settimanale"/"weekly" | "mensile"/"monthly" — already localized by the caller, matching the style of trial-check.ts's fmtDate/plan labels. */
  scheduleLabel: string;
  periodLabel: string;
  dashboardUrl: string;
  userEmail?: string;
  locale?: 'it' | 'en';
}

export function scheduledReportTemplate(params: ScheduledReportParams): string {
  const { organizationName, reportTitle, scheduleLabel, periodLabel, dashboardUrl, userEmail, locale = 'it' } = params;
  const isEn = locale === 'en';
  const safeOrganizationName = escapeHtml(organizationName);
  // reportTitle is free text a user typed when creating the scheduled report
  // (zod max(120), no character filter — src/app/api/reports/route.ts).
  const safeReportTitle = escapeHtml(reportTitle);

  const content = isEn ? `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#2A2520;line-height:1.3;">
      Your ${scheduleLabel} report is ready
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6B6760;">
      Here's "${safeReportTitle}" for ${safeOrganizationName}, attached to this email as a PDF.
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
           style="border:1px solid #E8DFD0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #E8DFD0;font-size:14px;color:#6B6760;width:40%;">Report</td>
        <td style="padding:12px 16px;border-bottom:1px solid #E8DFD0;font-size:14px;color:#2A2520;font-weight:600;text-align:right;">${safeReportTitle}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:14px;color:#6B6760;">Period</td>
        <td style="padding:12px 16px;font-size:14px;color:#2A2520;font-weight:600;text-align:right;">${periodLabel}</td>
      </tr>
    </table>

    <p style="margin:0;font-size:13px;color:#6B6760;">
      This report is generated automatically from your organization's real data.
      You can manage report scheduling from your dashboard.
    </p>
  ` : `
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
    title: isEn ? `Your ${scheduleLabel} report — Anlyra` : `Il tuo report ${scheduleLabel} — Anlyra`,
    preheader: isEn
      ? `"${reportTitle}" for ${organizationName} is ready, attached as a PDF.`
      : `"${reportTitle}" per ${organizationName} è pronto, in allegato in PDF.`,
    content,
    ctaButton: { label: isEn ? 'Go to dashboard' : 'Vai alla dashboard', href: dashboardUrl },
    userEmail,
    locale,
  });
}
