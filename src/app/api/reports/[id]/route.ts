import { NextRequest } from 'next/server';
import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/session';
import { requireManagerRole } from '@/lib/auth/require-role';
import { auditLog } from '@/lib/audit/log';
import { resolveReportConfig } from '@/lib/reports/config';
import { renderReportPdf, pdfResponse } from '@/lib/reports/render';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * One report of the caller's organization. Replaces the localStorage lookup the
 * detail page used to do, so a report opened on another device actually loads.
 * The share TOKEN is included only for owner/admin — it is the link's secret.
 */
export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) return fail('Unauthorized', 401);
    const { organizationId } = authCtx;

    const r = await prisma.report_b8.findFirst({ where: { id: params.id, organizationId } });
    if (!r) return fail('NOT_FOUND', 404);

    const canSeeToken = !requireManagerRole(authCtx);
    return ok({
      id: r.id,
      title: r.title,
      description: r.description,
      sections: JSON.parse(r.sections) as string[],
      schedule: r.schedule,
      recipients: r.recipients,
      lastRunAt: r.lastRunAt,
      createdAt: r.createdAt,
      renderable: resolveReportConfig(r) !== null,
      shared: !!r.shareToken,
      shareToken: canSeeToken ? r.shareToken : null,
      shareExpiresAt: r.shareExpiresAt,
    });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) return fail('Unauthorized', 401);
    const denied = requireManagerRole(authCtx);
    if (denied) return denied;
    const { organizationId } = authCtx;
    const r = await prisma.report_b8.findFirst({ where: { id: params.id, organizationId } });
    if (!r) return fail('NOT_FOUND', 404);
    await prisma.report_b8.delete({ where: { id: params.id } });
    await auditLog({
      action: 'report.delete',
      userId: authCtx.userId,
      organizationId,
      targetType: 'report',
      targetId: params.id,
      req: _req,
    });
    return ok({ id: params.id });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}

/**
 * "Run now": really generates the report PDF from the organization's live data
 * and streams it back. It used to only stamp lastRunAt, which told the user a
 * report had been produced when nothing had.
 *
 * lastRunAt is written ONLY after a successful render, so the timestamp means
 * "a PDF was produced on this date" and never "we tried".
 */
export async function POST(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) return fail('Unauthorized', 401);
    const { organizationId } = authCtx;

    const r = await prisma.report_b8.findFirst({ where: { id: params.id, organizationId } });
    if (!r) return fail('NOT_FOUND', 404);

    const config = resolveReportConfig(r);
    if (!config) return fail('REPORT_NOT_RENDERABLE', 422);

    const pdf = await renderReportPdf(organizationId, config);
    // No real data behind the requested sections: say so, do NOT stamp lastRunAt.
    if (!pdf) return fail('NO_DATA_FOR_REPORT', 422);

    await prisma.report_b8.update({
      where: { id: params.id },
      data: { lastRunAt: new Date() },
    });

    return pdfResponse(pdf, r.title);
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
