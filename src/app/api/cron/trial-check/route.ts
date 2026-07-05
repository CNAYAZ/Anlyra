import { NextResponse } from 'next/server';
import { runTrialCheck } from '@/lib/cron/trial-check';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
  return NextResponse.json({ success: true, ...result });
}
