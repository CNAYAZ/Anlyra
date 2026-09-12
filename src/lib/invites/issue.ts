import { prisma } from '@/lib/prisma';
import { generateToken, siteUrl } from '@/lib/auth/tokens';
import { sendEmail, teamInviteTemplate, sanitizeSubjectText } from '@/lib/email';
import { COMPANY } from '@/lib/company';

/** How long an invite link stays usable. */
export const INVITE_EXPIRY_HOURS = 72;

/**
 * The roles an invite may grant. 'owner' is deliberately absent: ownership is
 * not something an invite hands out (the creator of the organization is its
 * owner — see api/onboarding/organization). Anything outside this list falls
 * back to 'viewer', the least privileged role.
 */
export const INVITABLE_ROLES = ['admin', 'editor', 'viewer'] as const;

export type InvitableRole = (typeof INVITABLE_ROLES)[number];

export function isInvitableRole(role: string | null | undefined): role is InvitableRole {
  return typeof role === 'string' && (INVITABLE_ROLES as readonly string[]).includes(role);
}

/**
 * Creates (or refreshes) ONE invite row and sends its email.
 *
 * Shared by the two places that issue invites so the token generation, the
 * 72-hour expiry, the role whitelist and the email template live in exactly
 * one place:
 *   • POST /api/onboarding/organization — the invites typed while creating
 *     the organization, in a loop, one call per recipient;
 *   • POST /api/settings/team/invite — inviting into an organization that
 *     already exists.
 *
 * `existingInviteId`, when given, UPDATES that row instead of inserting a new
 * one: a fresh token, a fresh expiry, and the role of this latest request.
 * Issuing the new token overwrites the old one in the same statement, so the
 * previous link stops working the moment this returns — there is never a
 * window with two usable links for the same person.
 *
 * The caller decides WHO may invite and WHETHER this particular invite is
 * allowed (self-invite, already a member, …). This function only performs an
 * invite that has already been authorized.
 *
 * Never throws on a delivery failure: it returns `emailSent: false` with the
 * reason, because an invite whose email did not go out is useless and the
 * caller has to be able to say so.
 */
export async function issueTeamInvite(params: {
  organizationId: string;
  orgName: string;
  inviterId: string;
  inviterName: string | null;
  inviterEmail: string | null;
  email: string;
  role: string;
  existingInviteId?: string;
}): Promise<{ token: string; emailSent: boolean; emailError?: string }> {
  const email = params.email.trim().toLowerCase();
  const role = isInvitableRole(params.role) ? params.role : 'viewer';
  const token = generateToken();
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000);

  if (params.existingInviteId) {
    await prisma.invite.update({
      where: { id: params.existingInviteId },
      data: { role, token, expiresAt, invitedById: params.inviterId },
    });
  } else {
    await prisma.invite.create({
      data: {
        email,
        organizationId: params.organizationId,
        invitedById: params.inviterId,
        role,
        token,
        expiresAt,
      },
    });
  }

  // inviterName is free text the inviter typed for themselves (profile name)
  // landing in the Subject header of an email sent to someone else:
  // sanitizeSubjectText strips control characters/newlines (header injection,
  // e.g. a name ending in a line break followed by "Bcc: …") and caps the
  // length. Sanitized BEFORE the fallback test, so a name made entirely of
  // control characters still falls back to "Un collega" instead of leaving a
  // blank subject. It needs no HTML-escaping — a Subject header is not HTML;
  // the HTML body is escaped inside teamInviteTemplate itself (escapeHtml on
  // inviterName and orgName, escapeMailtoAddress on the mailto href).
  const inviterSubjectName = params.inviterName ? sanitizeSubjectText(params.inviterName) : '';

  const sendResult = await sendEmail({
    to: email,
    subject: `${inviterSubjectName || 'Un collega'} ti ha invitato su Anlyra`,
    html: teamInviteTemplate({
      inviterName: params.inviterName || params.inviterEmail || 'Un collega',
      inviterEmail: params.inviterEmail || COMPANY.noreplyEmail,
      orgName: params.orgName,
      userEmail: email,
      inviteUrl: `${siteUrl()}/it/invite/${token}`,
      expiryHours: INVITE_EXPIRY_HOURS,
    }),
  });

  if (!sendResult.success) {
    console.error('[email] team-invite failed', { to: email, reason: sendResult.error });
  }

  return { token, emailSent: sendResult.success, emailError: sendResult.error };
}
