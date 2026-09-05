import { prisma } from '@/lib/prisma';
import { appDateStartUTC, toAppDateString } from '@/lib/timezone';
import { resolveReportConfig } from '@/lib/reports/config';
import { renderReportPdf } from '@/lib/reports/render';
import { parseRecipients } from '@/lib/reports/recipients';
import { sendEmail, scheduledReportTemplate, MAX_EMAIL_ATTACHMENT_BYTES, sanitizeSubjectText } from '@/lib/email';
import { siteUrl } from '@/lib/auth/tokens';
import { auditLog } from '@/lib/audit/log';

/**
 * Delivers WEEKLY / MONTHLY reports by email with the PDF attached.
 *
 * Called from /api/cron/trial-check rather than its own cron entry: the
 * project is on Vercel's Hobby plan, which allows at most 2 crons, and both
 * slots are already taken (/api/cron/trial-check, /api/cron/gdpr-purge). This
 * job is bolted onto trial-check specifically — not gdpr-purge — because it is
 * the same KIND of job (evaluate subjects, conditionally send a transactional
 * email) rather than a destructive/purge job; keeping deletion logic and
 * report-delivery logic in separate functions, even when they share a cron
 * trigger, means a bug in one can never block the other by coupling their
 * control flow. trial-check also fires at 08:00 UTC, a far more sensible
 * inbox-landing time than gdpr-purge's 03:00.
 *
 * HOBBY'S ±1 HOUR TRIGGER WINDOW: this job never assumes an exact time of day.
 * Due-ness is computed on CALENDAR DATES in Europe/Rome (via timezone.ts), and
 * the cron itself only fires once per day — so whether Vercel actually invokes
 * it at 08:00 or 08:47 changes nothing about which day a comparison lands on
 * except in the (rare, already-tolerated) case of a delivery that slips past
 * local midnight, which merely defers the check to the next run, not skip a
 * cycle. Because due-ness compares against the stored lastRunAt/createdAt with
 * ">=", a cron run that is skipped entirely (an outage) is simply caught by
 * the next run — nothing is silently lost, and nothing double-fires, because
 * lastRunAt is only written after a fully successful send.
 */

/**
 * Caps how many reports one invocation processes. Vercel Hobby allows a
 * function to run up to 60s (see maxDuration on the cron route); each
 * iteration renders a PDF and sends an email, so this bounds the worst case
 * instead of risking a timeout that would abort mid-batch. Reports beyond the
 * cap are simply picked up on the NEXT day's run — due-ness is still measured
 * against their own lastRunAt, so nothing is skipped, only delayed by at most
 * a day, and the oldest-overdue reports are processed first (see the query
 * below) so nobody is starved indefinitely.
 */
const MAX_REPORTS_PER_RUN = 20;

const DAY_MS = 24 * 60 * 60 * 1000;

type ReportRow = {
  id: string;
  organizationId: string;
  title: string;
  sections: string;
  schedule: string | null;
  recipients: string | null;
  lastRunAt: Date | null;
  createdAt: Date;
  config: string | null;
};

/**
 * Whether a report is due, on CALENDAR-DAY granularity in Europe/Rome — never
 * compare raw millisecond timestamps here, or the cron's own jitter (or a
 * delivery just before/after local midnight) could cause drift.
 *
 * The baseline is lastRunAt, or createdAt when the report has never run: a
 * freshly-created weekly report sends its FIRST email 7 days after creation,
 * not immediately — "weekly" means a cadence going forward, not "now, then
 * repeat", matching what a user reading "weekly" in the builder would expect.
 */
function isDue(r: Pick<ReportRow, 'schedule' | 'lastRunAt' | 'createdAt'>, now: Date): boolean {
  const base = r.lastRunAt ?? r.createdAt;
  if (r.schedule === 'weekly') {
    const baseDay = appDateStartUTC(base).getTime();
    const todayDay = appDateStartUTC(now).getTime();
    return todayDay - baseDay >= 7 * DAY_MS;
  }
  if (r.schedule === 'monthly') {
    // Compares calendar months as "YYYY-MM" strings rather than day-of-month
    // arithmetic, which sidesteps every short-month edge case (a report last
    // sent Jan 31 does not need a "Feb 31" to exist — it becomes due the
    // moment the calendar reads any day in February).
    return toAppDateString(now).slice(0, 7) > toAppDateString(base).slice(0, 7);
  }
  return false;
}

export interface ScheduledReportsResult {
  due: number;
  sent: number;
  skippedNoData: number;
  skippedNoRecipients: number;
  failed: number;
}

function scheduleLabelIt(schedule: string): string {
  return schedule === 'weekly' ? 'settimanale' : 'mensile';
}

function periodLabelForConfig(period: string): string {
  const map: Record<string, string> = {
    '1m': 'Ultimo mese',
    '3m': 'Ultimi 3 mesi',
    '6m': 'Ultimi 6 mesi',
    '12m': 'Ultimi 12 mesi',
    custom: 'Periodo personalizzato',
  };
  return map[period] ?? map['12m'];
}

/** Filesystem/email-safe filename derived from the report title, mirroring the client-side download logic in reports/page.tsx. */
function safeFilename(title: string): string {
  return title.replace(/\s+/g, '_').replace(/[^\w.-]/g, '') || 'report';
}

async function processOne(r: ReportRow, now: Date, result: ScheduledReportsResult): Promise<void> {
  const config = resolveReportConfig(r);
  if (!config) {
    result.skippedNoData++;
    console.warn(`[cron/scheduled-reports] report ${r.id} has no renderable config — skipped`);
    return;
  }

  const recipients = parseRecipients(r.recipients);
  if (recipients.length === 0) {
    // Re-checked here even though POST /api/reports now requires recipients at
    // creation time: a report created before that validation existed could
    // still have none, and this must degrade to "skip", never "crash the run".
    result.skippedNoRecipients++;
    console.warn(`[cron/scheduled-reports] report ${r.id} has no recipients — skipped`);
    return;
  }

  const pdf = await renderReportPdf(r.organizationId, config);
  if (!pdf) {
    // No real data for the period: per the founder's rule, never send an empty
    // or fabricated PDF. Skip silently for the recipient, loudly for the log.
    result.skippedNoData++;
    console.warn(`[cron/scheduled-reports] report ${r.id}: no real data for the period — no email sent`);
    return;
  }

  if (pdf.length > MAX_EMAIL_ATTACHMENT_BYTES) {
    result.failed++;
    console.error(
      `[cron/scheduled-reports] report ${r.id}: PDF (${pdf.length} bytes) exceeds the email attachment limit — skipped`,
    );
    return;
  }

  const org = await prisma.organization.findUnique({
    where: { id: r.organizationId },
    select: { name: true },
  });

  const html = scheduledReportTemplate({
    organizationName: org?.name ?? '',
    reportTitle: r.title,
    scheduleLabel: scheduleLabelIt(r.schedule!),
    periodLabel: periodLabelForConfig(config.period),
    dashboardUrl: `${siteUrl()}/it/reports`,
  });

  const sendResult = await sendEmail({
    to: recipients,
    // r.title is free text typed when the report was created (zod max(120),
    // no character filter) — see sanitizeSubjectText for why a Subject
    // header needs this even though scheduledReportTemplate escapes it
    // separately for the HTML body.
    subject: `Il tuo report ${scheduleLabelIt(r.schedule!)} è pronto — ${sanitizeSubjectText(r.title)}`,
    html,
    attachments: [{ filename: `${safeFilename(r.title)}.pdf`, content: pdf }],
  });

  if (!sendResult.success) {
    result.failed++;
    console.error(`[cron/scheduled-reports] report ${r.id}: email send failed — ${sendResult.error}`);
    return;
  }

  // lastRunAt is written ONLY after a confirmed-successful send — same
  // contract as "Run now" in /api/reports/[id]/route.ts, extended here to mean
  // "delivered", not merely "rendered".
  await prisma.report_b8.update({ where: { id: r.id }, data: { lastRunAt: now } });
  result.sent++;

  // Cron-triggered: no acting user, hence userId is omitted (the audit schema
  // allows this for system actions — see src/lib/audit/log.ts).
  await auditLog({
    action: 'report.scheduled_delivery',
    organizationId: r.organizationId,
    targetType: 'report',
    targetId: r.id,
    metadata: { schedule: r.schedule ?? '', recipientCount: recipients.length },
  });
}

export async function runScheduledReports(now: Date = new Date()): Promise<ScheduledReportsResult> {
  const result: ScheduledReportsResult = {
    due: 0,
    sent: 0,
    skippedNoData: 0,
    skippedNoRecipients: 0,
    failed: 0,
  };

  const candidates = await prisma.report_b8.findMany({
    where: { schedule: { in: ['weekly', 'monthly'] } },
    orderBy: [{ lastRunAt: 'asc' }], // never-run (null) sort first, then oldest-overdue — nobody starves under the cap.
  });

  const due = candidates.filter((r) => isDue(r, now));
  result.due = due.length;

  for (const r of due.slice(0, MAX_REPORTS_PER_RUN)) {
    try {
      await processOne(r, now, result);
    } catch (e) {
      result.failed++;
      console.error(`[cron/scheduled-reports] report ${r.id} failed unexpectedly:`, e);
      // Deliberately continues to the next report — one failure must never
      // block the rest of the batch.
    }
  }

  return result;
}
