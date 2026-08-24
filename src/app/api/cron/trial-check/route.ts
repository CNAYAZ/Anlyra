import { NextResponse } from 'next/server';
import { runTrialCheck } from '@/lib/cron/trial-check';
import { runScheduledReports } from '@/lib/cron/scheduled-reports';
import { runCreditRenewal } from '@/lib/cron/credit-renewal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Vercel Hobby's default function duration is 10s; this route now also renders
// PDFs and sends emails with attachments for due scheduled reports, so it is
// raised to 60s (the maximum Hobby allows) to give that a real margin. See
// MAX_REPORTS_PER_RUN in scheduled-reports.ts for the corresponding cap that
// keeps a single run from ever needing all 60s.
export const maxDuration = 60;

// Protected by CRON_SECRET. Vercel Cron sends `Authorization: Bearer <secret>`.
// Fail-CLOSED: if CRON_SECRET is not configured we refuse to run (never execute
// the job for an anonymous caller), and the secret is accepted ONLY via the
// Authorization header — never via query string, which would leak into access logs.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.warn('[cron/trial-check] CRON_SECRET is not configured — refusing to run (fail-closed).');
    return NextResponse.json({ error: 'CRON_NOT_CONFIGURED' }, { status: 503 });
  }

  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const result = await runTrialCheck();

  // Bolted on rather than a separate cron: Hobby allows at most 2, and both are
  // already spoken for. Best-effort and isolated in its own try/catch — a bug
  // in report delivery must never turn a completed trial-check run into a
  // failure response, and vice versa (runTrialCheck already ran and returned
  // above this line).
  let scheduledReports = null;
  try {
    scheduledReports = await runScheduledReports();
    console.info(
      `[cron/trial-check] scheduled reports: due=${scheduledReports.due} sent=${scheduledReports.sent} ` +
        `skippedNoData=${scheduledReports.skippedNoData} skippedNoRecipients=${scheduledReports.skippedNoRecipients} ` +
        `failed=${scheduledReports.failed}`,
    );
  } catch (e) {
    console.error('[cron/trial-check] scheduled reports run failed:', e);
  }

  // Monthly AI-credit renewal — bolted on for the same reason as the reports
  // above (Hobby allows only 2 crons, both taken), and isolated the same way:
  // its own try/catch, so a failure here cannot mark the trial-check or the
  // report delivery as failed, and a failure in either of those cannot prevent
  // this from running. See lib/cron/credit-renewal.ts for the due-ness rules.
  let creditRenewal = null;
  try {
    creditRenewal = await runCreditRenewal();
    console.info(
      `[cron/trial-check] credit renewal: considered=${creditRenewal.considered} renewed=${creditRenewal.renewed} ` +
        `skippedAlreadyRenewed=${creditRenewal.skippedAlreadyRenewed} ` +
        `skippedUnknownPlan=${creditRenewal.skippedUnknownPlan} failed=${creditRenewal.failed}`,
    );
  } catch (e) {
    console.error('[cron/trial-check] credit renewal run failed:', e);
  }

  return NextResponse.json({ success: true, ...result, scheduledReports, creditRenewal });
}
