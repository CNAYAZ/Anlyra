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

export type RecipientsSplit = {
  /** Addresses that are STILL a member of the organization right now. */
  members: string[];
  /** Addresses stored on the report that are no longer (or never were) members. */
  nonMembers: string[];
};

/**
 * Splits a report's stored recipients into "still a member" and "no longer a
 * member", AT THE MOMENT OF ASKING.
 *
 * WHY THIS EXISTS ALONGSIDE validateReportRecipients: that function answers a
 * different question, for a different moment. It is the SAVE-TIME gate — it is
 * all-or-nothing on purpose (one bad address rejects the whole form with a 400,
 * so the person typing it fixes it there and then), and on a malformed address
 * it returns before ever looking at memberships, so it cannot say who is and
 * who is not a member. The cron needs the opposite shape: it has no user to
 * show an error to, it must deliver to whoever is still entitled, and it must
 * be able to name the addresses it dropped. Neither its return type nor its
 * early-exit behaviour fits that, so this is a second function rather than a
 * rewrite of the first — validateReportRecipients is untouched and the save
 * path behaves exactly as before.
 *
 * WHY THE CHECK HAS TO BE REPEATED AT SEND TIME AT ALL: the save-time gate is a
 * snapshot. Membership can end after it passes — a person deletes their account
 * (GDPR: /api/gdpr/account marks it, the gdpr-purge cron deletes the User row
 * and the Membership cascades away with it) or is removed from the team — while
 * the report's `recipients` column, plain text typed by the customer, keeps
 * their address forever. Without this, that person keeps receiving the
 * company's revenue, costs and cashflow every month, by email, with no login,
 * for as long as the report exists.
 *
 * Same comparison rule as the save-time gate: both sides lowercased
 * (parseRecipients on the stored value, toLowerCase on User.email).
 */
export async function splitRecipientsByMembership(
  organizationId: string,
  raw: string | null | undefined,
): Promise<RecipientsSplit> {
  const candidates = parseRecipients(raw);
  if (candidates.length === 0) return { members: [], nonMembers: [] };

  const members = await prisma.membership.findMany({
    where: { organizationId },
    include: { user: { select: { email: true } } },
  });
  const memberEmails = new Set(
    members.map((m) => m.user?.email?.toLowerCase()).filter((e): e is string => !!e),
  );

  return {
    members: candidates.filter((c) => memberEmails.has(c)),
    nonMembers: candidates.filter((c) => !memberEmails.has(c)),
  };
}
