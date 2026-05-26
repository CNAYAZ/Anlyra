import { NextResponse } from 'next/server';
import { runTrialCheck } from '@/lib/cron/trial-check';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Protected by CRON_SECRET. Vercel Cron sends `Authorization: Bearer <secret>`.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    const url = new URL(req.url);
    const qsSecret = url.searchParams.get('secret');
    const ok = auth === `Bearer ${secret}` || qsSecret === secret;
    if (!ok) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
  }

  const result = await runTrialCheck();
  return NextResponse.json({ success: true, ...result });
}
