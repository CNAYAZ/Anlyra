import { NextResponse } from 'next/server';
import { runGdprPurge } from '@/lib/gdpr/purge';
import { purgeOldWebhookEvents } from '@/lib/billing/webhook-retention';
import { purgeOldAuditLogs, AUDIT_LOG_RETENTION_MONTHS } from '@/lib/audit/retention';
import { runTrialDataPurge } from '@/lib/cron/trial-data-retention';
import { purgeTrialClaimData } from '@/lib/billing/trial-claims';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Protected by CRON_SECRET, byte-for-byte the same contract as
// /api/cron/trial-check. Vercel Cron sends `Authorization: Bearer <secret>`.
// Fail-CLOSED: without CRON_SECRET we refuse to run rather than let an anonymous
// caller trigger PERMANENT deletions, and the secret is accepted only via the
// Authorization header — never a query string, which would leak into access logs.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.warn('[cron/gdpr-purge] CRON_SECRET is not configured — refusing to run (fail-closed).');
    return NextResponse.json({ error: 'CRON_NOT_CONFIGURED' }, { status: 503 });
  }

  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const result = await runGdprPurge();
  console.info(
    `[cron/gdpr-purge] cutoff=${result.cutoff} orgs=${result.organizationsPurged.length} users=${result.usersPurged.length} errors=${result.errors.length}`,
  );

  // Housekeeping bolted onto this nightly run instead of a second cron: expire
  // Stripe idempotency records well past Stripe's retry horizon. Best-effort —
  // a failure here must not turn a completed GDPR purge into a 500.
  let webhookEventsPurged = 0;
  try {
    webhookEventsPurged = await purgeOldWebhookEvents();
    console.info(`[cron/gdpr-purge] stripe idempotency rows purged=${webhookEventsPurged}`);
  } catch (e) {
    console.error('[cron/gdpr-purge] stripe idempotency purge failed:', e);
  }

  // Audit-log retention, on the same nightly run and with the same best-effort
  // contract as the housekeeping above: the Privacy Policy promises audit rows
  // live at most 12 months, and until now nothing enforced it. A failure here
  // must not turn a completed GDPR purge into a 500 either.
  let auditLogRowsPurged = 0;
  try {
    auditLogRowsPurged = await purgeOldAuditLogs();
    console.info(
      `[cron/gdpr-purge] audit rows older than ${AUDIT_LOG_RETENTION_MONTHS} months purged=${auditLogRowsPurged}`,
    );
  } catch (e) {
    console.error('[cron/gdpr-purge] audit log retention purge failed:', e);
  }

  // Data of expired trials that never paid, 12 months after the trial ended and
  // never before 30 days from the notice (src/lib/cron/trial-data-retention.ts).
  // Same best-effort contract: a failure here must not undo the GDPR purge above.
  let trialDataPurge = null;
  try {
    trialDataPurge = await runTrialDataPurge();
    console.info(
      `[cron/gdpr-purge] trial data: considered=${trialDataPurge.considered} purged=${trialDataPurge.purged.length} ` +
        `notYetDue=${trialDataPurge.notYetDue} skippedPaid=${trialDataPurge.skippedPaid} ` +
        `skippedPaymentUnknown=${trialDataPurge.skippedPaymentUnknown} errors=${trialDataPurge.errors.length}`,
    );
  } catch (e) {
    console.error('[cron/gdpr-purge] trial data purge failed:', e);
  }

  // The register of trials and the IP of the Terms acceptances
  // (@/lib/billing/trial-claims): IP cleared after 12 months, register rows
  // deleted after 24, acceptance rows kept with their IP cleared after 12.
  // Same best-effort contract as the steps above.
  let trialClaimIpsCleared = 0;
  let trialClaimsDeleted = 0;
  let termsAcceptanceIpsCleared = 0;
  try {
    ({ trialClaimIpsCleared, trialClaimsDeleted, termsAcceptanceIpsCleared } = await purgeTrialClaimData());
    console.info(
      `[cron/gdpr-purge] trial register: ipsCleared=${trialClaimIpsCleared} rowsDeleted=${trialClaimsDeleted} ` +
        `termsAcceptanceIpsCleared=${termsAcceptanceIpsCleared}`,
    );
  } catch (e) {
    console.error('[cron/gdpr-purge] trial register expiry failed:', e);
  }

  return NextResponse.json({
    success: true,
    ...result,
    webhookEventsPurged,
    auditLogRowsPurged,
    trialDataPurge,
    trialClaimIpsCleared,
    trialClaimsDeleted,
    termsAcceptanceIpsCleared,
  });
}
