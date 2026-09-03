import { NextRequest, NextResponse } from 'next/server';
import { reportConfigSchema } from '@/lib/reports/types';
import { renderReportPdf, pdfResponse } from '@/lib/reports/render';
import { getAuthContext } from '@/lib/session';
import { requireWritableOrg } from '@/lib/auth/require-writable';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { authRateLimitResponse } from '@/lib/api/rate-limit-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // AUTHENTICATED since this route started serving REAL organization data.
  // It used to be public because the payload was invented sample data; keeping it
  // open now would publish the company's revenue, costs and cashflow to anyone
  // who can POST a JSON body. Identity comes from getAuthContext (no demo
  // fallback) and the PDF is built for THAT user's organization only — the body
  // carries the report options, never an organization id.
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  // Demo organization: read-only. See requireWritableOrg.
  const readOnly = requireWritableOrg(ctx.organizationId);
  if (readOnly) return readOnly;

  // Rate limit kept as it was: PDF rendering is CPU-heavy. Now keyed by
  // IP + organization, so one tenant cannot exhaust the budget of another.
  const rl = await checkRateLimit(
    'report-generate-ip',
    `${getClientIp(req)}:org:${ctx.organizationId}`,
  );
  if (!rl.success) return authRateLimitResponse(rl);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = reportConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues.map((i) => i.message).join('; ') },
      { status: 400 },
    );
  }

  try {
    const pdf = await renderReportPdf(ctx.organizationId, parsed.data);
    if (!pdf) {
      // No real data for the requested window/sections. An empty-handed answer is
      // the honest one; the old behaviour would have produced a sample-data PDF.
      return NextResponse.json({ success: false, error: 'NO_DATA_FOR_REPORT' }, { status: 422 });
    }
    return pdfResponse(pdf, parsed.data.title);
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'PDF generation failed' },
      { status: 500 },
    );
  }
}
