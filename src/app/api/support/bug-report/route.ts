import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ok, fail } from '@/lib/api';
import { getAuthContext } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { getBillingState, getCreditBalance } from '@/lib/billing/repository';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { rateLimitResponse } from '@/lib/api/rate-limit-response';
import { sendEmail, bugReportTemplate } from '@/lib/email';
import { auditLog } from '@/lib/audit/log';
import { APP_TIME_ZONE } from '@/lib/timezone';
import { COMPANY } from '@/lib/company';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// A problem is described in a few sentences or a short paragraph. 5000
// characters (roughly 800-1000 words) is generous headroom for a detailed
// report while staying small enough to read comfortably in one email and to
// bound the worst case on top of the rate limit below.
const MAX_DESCRIPTION_CHARS = 5000;
const MAX_TECH_FIELD_CHARS = 300;


const BodySchema = z.object({
  description: z.string().trim().min(1).max(MAX_DESCRIPTION_CHARS),
  page: z.string().max(MAX_TECH_FIELD_CHARS),
  userAgent: z.string().max(MAX_TECH_FIELD_CHARS),
  screenWidth: z.number().int().positive().max(20000),
  screenHeight: z.number().int().positive().max(20000),
});

export async function POST(req: NextRequest) {
  // Auth is mandatory: an open bug-report form is a free channel to send email
  // as Anlyra to anyone who finds the endpoint.
  const ctx = await getAuthContext();
  if (!ctx) return fail('Unauthorized', 401);
  const { userId, organizationId, email } = ctx;

  // Both per-user and per-IP: a compromised/shared IP (office NAT) must not
  // block one legitimate user's reports, and a single account retrying must
  // not be able to route around the IP limit by switching networks.
  const [userLimit, ipLimit] = await Promise.all([
    checkRateLimit('bug-report-user', `${organizationId}:${userId}`),
    checkRateLimit('bug-report-ip', getClientIp(req)),
  ]);
  const limited = !userLimit.success ? userLimit : !ipLimit.success ? ipLimit : null;
  if (limited) {
    return rateLimitResponse(limited);
  }

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return fail('INVALID_INPUT', 400);
  const { description, page, userAgent, screenWidth, screenHeight } = parsed.data;

  // Context the report is built from: identity + org standing. Deliberately
  // NOT included anywhere below: financial figures, customer names, AI
  // conversation content, tokens, passwords — only technical + identifying
  // context about the person reporting, per the founder's decision.
  const [user, org, billing, credits] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    prisma.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { name: true } }),
    getBillingState(organizationId),
    getCreditBalance(organizationId),
  ]);

  const occurredAt = new Intl.DateTimeFormat('it-IT', {
    timeZone: APP_TIME_ZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());

  const html = bugReportTemplate({
    description,
    reporterName: user?.name ?? null,
    reporterEmail: email ?? 'sconosciuta',
    organizationName: org.name,
    plan: billing.plan,
    credits,
    page,
    userAgent,
    screenResolution: `${screenWidth}×${screenHeight}`,
    occurredAt,
  });

  const result = await sendEmail({
    to: COMPANY.contactEmail,
    subject: `[Segnalazione] ${org.name}`,
    html,
    // Lets the founder hit "reply" in their inbox and land directly on the
    // reporting user — only when we actually have an address to use.
    replyTo: email ?? undefined,
  });

  if (!result.success) {
    // Never claim success on a failed send — the user needs to know to retry
    // or reach out another way.
    return fail(result.error ?? 'EMAIL_SEND_FAILED', 502);
  }

  await auditLog({
    action: 'support.bug_report',
    userId,
    organizationId,
    req,
    // Structural facts only — never the description text the user typed (see
    // the "NEVER FAILS THE CALLER / PRIVACY" note in lib/audit/log.ts).
    metadata: { page, descriptionLength: description.length },
  });

  return ok({ sent: true });
}
