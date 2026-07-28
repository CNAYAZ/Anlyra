import { NextResponse } from 'next/server';
import { runGdprPurge } from '@/lib/gdpr/purge';

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
  return NextResponse.json({ success: true, ...result });
}
