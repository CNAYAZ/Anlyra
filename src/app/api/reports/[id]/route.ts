import { NextRequest } from 'next/server';
import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/session';
import { requireWritableOrg } from '@/lib/auth/require-writable';
import { requireManagerRole } from '@/lib/auth/require-role';
import { auditLog } from '@/lib/audit/log';
import { resolveReportConfig } from '@/lib/reports/config';
import { renderReportPdf, pdfResponse } from '@/lib/reports/render';
import { parseRecipients, validateReportRecipients } from '@/lib/reports/recipients';
import { createSchema } from '../route';

// Only title/schedule/recipients are editable here — NOT sections/config. The
// task this route was built for is specifically "a customer must be able to
// see and change a scheduled report's recipients and cadence" (a former
// member's address stuck forever in `recipients`, with no way to remove it —
// there was no PATCH at all before this file). Sections editing would also
// require rebuilding `config` via bridgeSections, same as POST /api/reports
// does at creation (~righe 103-114) — a second, independent piece of surface
// this task did not ask for and that was explicitly out of scope ("non
// rifattorizzare"). If section editing is wanted later, reuse bridgeSections
// exactly as creation does; do not hand-roll a second config builder.
const updateSchema = createSchema.pick({ title: true, schedule: true, recipients: true }).partial();

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

/**
 * Updates a report's title, schedule and/or recipients. Owner/admin only
 * (requireManagerRole) — the founder's decision: changing WHO receives the
 * company's revenue, costs and cashflow is the same kind of call as creating
 * the public share link (reports/[id]/share/route.ts), which carries the
 * same guard.
 *
 * Any field left out of the request body is UNCHANGED, not cleared — this is
 * a partial update, not a replacement of the whole report.
 */
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) return fail('Unauthorized', 401);
    // Demo organization: read-only. See requireWritableOrg.
    const readOnly = requireWritableOrg(authCtx.organizationId);
    if (readOnly) return readOnly;
    const denied = requireManagerRole(authCtx);
    if (denied) return denied;
    const { organizationId } = authCtx;

    // Same tenant-isolation pattern as every other handler in this file: the
    // lookup is scoped to THIS organization, so a report id belonging to
    // another tenant simply does not match and falls through to NOT_FOUND —
    // never a 403 that would confirm the id exists elsewhere.
    const r = await prisma.report_b8.findFirst({ where: { id: params.id, organizationId } });
    if (!r) return fail('NOT_FOUND', 404);

    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'INVALID', 400);

    // The EFFECTIVE schedule/recipients this update would leave the report
    // with — a field absent from the request body means "keep what's there",
    // not "clear it".
    const nextSchedule = parsed.data.schedule ?? ((r.schedule as 'weekly' | 'monthly' | null) ?? 'on_demand');
    const recipientsProvided = parsed.data.recipients !== undefined;
    const nextRecipientsRaw = recipientsProvided ? parsed.data.recipients : (r.recipients ?? undefined);

    // Same rule POST /api/reports applies at creation (route.ts ~riga 81): a
    // schedule other than on_demand always needs at least one recipient. This
    // is what stops the last recipient being removed from an already-scheduled
    // report and leaving it looking active in the UI while it can never send
    // anything again. Going the OTHER way — schedule set back to on_demand —
    // does NOT require recipients, matching creation's own rule for on_demand
    // reports; recipients can be cleared in the same request that turns the
    // schedule off.
    if (nextSchedule !== 'on_demand' && !nextRecipientsRaw?.trim()) {
      return fail('RECIPIENTS_REQUIRED', 400);
    }

    // Re-validate recipients only when they are PART OF THIS PATCH. Recipients
    // left untouched were already validated when the report was created (or by
    // an earlier PATCH); re-checking them on every edit would fail a
    // title-only save the moment one existing recipient stops being a member —
    // that case is already handled at send time by the cron
    // (splitRecipientsByMembership in this same module), not something an
    // unrelated edit should be blocked by.
    if (recipientsProvided && nextRecipientsRaw?.trim()) {
      const validation = await validateReportRecipients(organizationId, nextRecipientsRaw);
      if (!validation.ok) {
        return fail(
          validation.reason === 'INVALID_FORMAT'
            ? `INVALID_RECIPIENT_FORMAT: ${validation.invalid.join(', ')}`
            : `RECIPIENT_NOT_ORG_MEMBER: ${validation.invalid.join(', ')}`,
          400,
        );
      }
    }

    const data: { title?: string; schedule?: 'weekly' | 'monthly' | null; recipients?: string | null } = {};
    if (parsed.data.title !== undefined) data.title = parsed.data.title;
    if (parsed.data.schedule !== undefined) {
      data.schedule = parsed.data.schedule === 'on_demand' ? null : parsed.data.schedule;
    }
    if (parsed.data.recipients !== undefined) {
      // Same normalization as creation (route.ts: `recipients: parsed.data.recipients ?? null`).
      data.recipients = parsed.data.recipients ?? null;
    }

    const updated = await prisma.report_b8.update({ where: { id: r.id }, data });

    await auditLog({
      action: 'report.update',
      userId: authCtx.userId,
      organizationId,
      targetType: 'report',
      targetId: r.id,
      req,
      metadata: {
        titleChanged: parsed.data.title !== undefined,
        scheduleChanged: parsed.data.schedule !== undefined,
        recipientsChanged: recipientsProvided,
        recipientCount: parseRecipients(nextRecipientsRaw).length,
      },
    });

    return ok({
      id: updated.id,
      title: updated.title,
      schedule: updated.schedule,
      recipients: updated.recipients,
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
    // Demo organization: read-only. See requireWritableOrg.
    const readOnly1 = requireWritableOrg(authCtx.organizationId);
    if (readOnly1) return readOnly1;
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
    // Demo organization: read-only. See requireWritableOrg.
    const readOnly2 = requireWritableOrg(authCtx.organizationId);
    if (readOnly2) return readOnly2;
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
