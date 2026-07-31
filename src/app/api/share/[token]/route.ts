import { NextRequest } from 'next/server';
import { ok, fail } from '@/lib/api';
import { checkRateLimit, getClientIp, retryAfterSeconds } from '@/lib/rate-limit';
import { NextResponse } from 'next/server';
import { resolveShareToken } from '@/lib/reports/share';
import { resolveReportConfig } from '@/lib/reports/config';
import { buildRealPayload } from '@/lib/reports/real-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PUBLIC — resolves a share token to the report behind it. No session by design:
 * that is what a share link is for. The token itself is the credential.
 *
 * WHAT IT RETURNS: the title, the period, and the numbers of THAT report only.
 *
 * WHAT IT NEVER RETURNS (checked field by field below):
 *   • the report's internal id, and the organization's internal id
 *   • any other report of the organization — the lookup is BY TOKEN, so a
 *     caller cannot ask for a different one
 *   • users, emails, membership or any personal data: none is read
 *   • billing, credits, integrations or API keys: none is read
 * The organization NAME and INDUSTRY do travel, because the report is about that
 * company and its cover page carries them — sharing the link is choosing to
 * disclose exactly that.
 */
export async function GET(req: NextRequest, props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  // Public route → rate-limited like the other public endpoints, keyed by IP.
  // Also blunts brute-forcing tokens.
  const rl = await checkRateLimit('share-token-ip', getClientIp(req));
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: 'TOO_MANY_REQUESTS' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds(rl.reset)) } },
    );
  }

  const lookup = await resolveShareToken(params.token);
  if (!lookup.ok) {
    // Same 404 for "never existed", "revoked" and "expired" would hide the reason
    // the viewer needs; the distinction leaks nothing (they already hold a token).
    return fail(lookup.reason, lookup.reason === 'EXPIRED' ? 410 : 404);
  }

  const report = lookup.report;
  const config = resolveReportConfig(report);
  if (!config) return fail('REPORT_NOT_RENDERABLE', 422);

  const real = await buildRealPayload(report.organizationId, config);
  if (!real) return fail('NO_DATA_FOR_REPORT', 422);

  return ok({
    title: report.title,
    description: report.description,
    createdAt: report.createdAt,
    expiresAt: report.shareExpiresAt,
    language: config.language,
    sections: real.sections,
    // The rendered figures, exactly what the PDF shows — no internal ids.
    organization: real.payload.organization,
    period: real.payload.period,
    kpis: real.payload.kpis,
    finance: real.payload.finance,
    cashflow: real.payload.cashflow,
    projections: real.payload.projections,
    recommendations: real.payload.recommendations,
  });
}
