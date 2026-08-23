import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const emailSchema = z.string().trim().email();

/** Splits, trims and lowercases a comma-separated recipients string. Ignores empty entries. */
export function parseRecipients(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
}

export type RecipientsValidation =
  | { ok: true; recipients: string[] }
  | { ok: false; reason: 'INVALID_FORMAT' | 'NOT_ORG_MEMBER'; invalid: string[] };

/**
 * Validates a scheduled report's recipients against the organization's ACTUAL
 * members, not just email format.
 *
 * WHY member-only, not "any well-formed address": a scheduled report emails
 * real company financials (revenue, costs, cashflow) with no login required to
 * open the PDF once it lands in an inbox. A free-text "recipients" field that
 * accepts any address is a direct exfiltration path — type in an outside email
 * and the org's numbers leave the company on a schedule, silently, forever.
 * Restricting to people who ALREADY have a Membership on this organization (and
 * therefore already see this data by logging in) closes that path without
 * adding a new permission concept: it can only ever send to someone who could
 * already open the dashboard and see the same numbers.
 *
 * Case-insensitive on the stored User.email, matching how email addresses are
 * conventionally compared everywhere else in the auth flow.
 */
export async function validateReportRecipients(
  organizationId: string,
  raw: string | null | undefined,
): Promise<RecipientsValidation> {
  const candidates = parseRecipients(raw);

  const malformed = candidates.filter((c) => !emailSchema.safeParse(c).success);
  if (malformed.length > 0) {
    return { ok: false, reason: 'INVALID_FORMAT', invalid: malformed };
  }
  if (candidates.length === 0) {
    return { ok: true, recipients: [] };
  }

  const members = await prisma.membership.findMany({
    where: { organizationId },
    include: { user: { select: { email: true } } },
  });
  const memberEmails = new Set(
    members.map((m) => m.user?.email?.toLowerCase()).filter((e): e is string => !!e),
  );

  const notMembers = candidates.filter((c) => !memberEmails.has(c));
  if (notMembers.length > 0) {
    return { ok: false, reason: 'NOT_ORG_MEMBER', invalid: notMembers };
  }

  return { ok: true, recipients: candidates };
}
