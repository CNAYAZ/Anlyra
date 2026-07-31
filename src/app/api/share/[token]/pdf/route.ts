import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, retryAfterSeconds } from '@/lib/rate-limit';
import { resolveShareToken } from '@/lib/reports/share';
import { resolveReportConfig } from '@/lib/reports/config';
import { renderReportPdf, pdfResponse } from '@/lib/reports/render';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PUBLIC — downloads the PDF of a shared report. Same token rules as the JSON
 * route (revoked or expired → no PDF), and the organization is taken from the
 * report the token resolves to, never from the request.
 *
 * Rate-limited on the PDF budget (rendering is CPU-heavy) rather than the
 * lookup one, so anonymous downloads cannot exhaust the app's CPU.
 */
export async function GET(req: NextRequest, props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  const rl = await checkRateLimit('report-generate-ip', `share:${getClientIp(req)}`);
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: 'TOO_MANY_REQUESTS' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds(rl.reset)) } },
    );
  }

  const lookup = await resolveShareToken(params.token);
  if (!lookup.ok) {
    return NextResponse.json(
      { success: false, error: lookup.reason },
      { status: lookup.reason === 'EXPIRED' ? 410 : 404 },
    );
  }

  const report = lookup.report;
  const config = resolveReportConfig(report);
  if (!config) {
    return NextResponse.json({ success: false, error: 'REPORT_NOT_RENDERABLE' }, { status: 422 });
  }

  const pdf = await renderReportPdf(report.organizationId, config);
  if (!pdf) {
    return NextResponse.json({ success: false, error: 'NO_DATA_FOR_REPORT' }, { status: 422 });
  }

  return pdfResponse(pdf, report.title);
}
