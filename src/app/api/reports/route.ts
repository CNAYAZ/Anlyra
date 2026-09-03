import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, fail, failFromError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentContext, getAuthContext } from '@/lib/session';
import { requireWritableOrg } from '@/lib/auth/require-writable';
import { reportPeriodSchema, reportLanguageSchema } from '@/lib/reports/types';
import { bridgeSections } from '@/lib/reports/config';
import { validateReportRecipients } from '@/lib/reports/recipients';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().optional(),
  sections: z.array(z.string()).min(1),
  schedule: z.enum(['on_demand', 'weekly', 'monthly']).default('on_demand'),
  recipients: z.string().optional(),
  // PDF rendering options. The live builder does not ask for them yet, so they
  // are optional and defaulted here; persisting them means "Run now" and the
  // share link render the report the same way every time.
  period: reportPeriodSchema.optional(),
  language: reportLanguageSchema.optional(),
  includeCharts: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { organizationId } = await getCurrentContext();
    const sp = req.nextUrl.searchParams;
    const onlyScheduled = sp.get('scheduled') === '1';

    const where: { organizationId: string; schedule?: { not: null } } = { organizationId };
    if (onlyScheduled) where.schedule = { not: null };

    const reports = await prisma.report_b8.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const data = reports
      .filter((r) => !onlyScheduled || (r.schedule && r.schedule !== 'on_demand'))
      .map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        sections: JSON.parse(r.sections) as string[],
        schedule: r.schedule,
        recipients: r.recipients,
        lastRunAt: r.lastRunAt,
        createdAt: r.createdAt,
        // Share state for the list UI. The token itself is NOT sent here: it is
        // returned only to the owner/admin who creates the link.
        shared: !!r.shareToken,
        shareExpiresAt: r.shareExpiresAt,
      }));

    return ok({ reports: data });
  } catch (e) {
    return failFromError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) return fail('Unauthorized', 401);
    // Demo organization: read-only. See requireWritableOrg.
    const readOnly = requireWritableOrg(authCtx.organizationId);
    if (readOnly) return readOnly;
    const { organizationId } = authCtx;
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'INVALID', 400);

    // A scheduled report with nobody to send it to would silently never
    // deliver anything while still looking "active" in the UI — require
    // recipients whenever a schedule is set, matching what the builder already
    // shows as a field (see reports/builder/page.tsx) even though it is not
    // marked required there today.
    if (parsed.data.schedule !== 'on_demand' && !parsed.data.recipients?.trim()) {
      return fail('RECIPIENTS_REQUIRED', 400);
    }

    // Recipients must be real members of THIS organization — see the long note
    // in validateReportRecipients for why a free-text address is an abuse
    // vector for a report that emails real company financials.
    if (parsed.data.recipients?.trim()) {
      const validation = await validateReportRecipients(organizationId, parsed.data.recipients);
      if (!validation.ok) {
        return fail(
          validation.reason === 'INVALID_FORMAT'
            ? `INVALID_RECIPIENT_FORMAT: ${validation.invalid.join(', ')}`
            : `RECIPIENT_NOT_ORG_MEMBER: ${validation.invalid.join(', ')}`,
          400,
        );
      }
    }

    // Persist the PDF config alongside the stored section keys. Sections that the
    // PDF cannot fill with real data are dropped by bridgeSections; when nothing
    // maps, config stays null and the report is simply not renderable.
    const pdfSections = bridgeSections(parsed.data.sections);
    const config =
      pdfSections.length > 0
        ? JSON.stringify({
            type: 'custom',
            period: parsed.data.period ?? '12m',
            sections: pdfSections,
            language: parsed.data.language ?? 'it',
            includeCharts: parsed.data.includeCharts ?? true,
            title: parsed.data.title,
          })
        : null;

    const created = await prisma.report_b8.create({
      data: {
        organizationId,
        title: parsed.data.title,
        description: parsed.data.description,
        sections: JSON.stringify(parsed.data.sections),
        schedule: parsed.data.schedule === 'on_demand' ? null : parsed.data.schedule,
        recipients: parsed.data.recipients ?? null,
        config,
      },
    });
    return ok({ id: created.id });
  } catch (e) {
    return failFromError(e);
  }
}
