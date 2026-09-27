import { prisma } from '@/lib/prisma';
import { requireActiveAccess } from '@/lib/billing/server-gate';

/** Default lifetime of a public share link. */
export const SHARE_LINK_TTL_DAYS = 30;

export type SharedReport = {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  sections: string;
  config: string | null;
  createdAt: Date;
  shareExpiresAt: Date | null;
};

export type ShareLookup =
  | { ok: true; report: SharedReport }
  | { ok: false; reason: 'NOT_FOUND' | 'EXPIRED' | 'UNAVAILABLE' };

/**
 * Resolves a public share token to its report. Single source of truth for the
 * validity rules, shared by the JSON route and the PDF route so they can never
 * disagree about whether a link is still live.
 *
 * A revoked link has shareToken = NULL, so it simply stops matching: there is no
 * "revoked but still resolvable" state.
 *
 * UNAVAILABLE (founder's rule, 2026-09-27): the organization has no active
 * subscription or running trial — the same test as requireActiveAccess. The
 * link shows no figures and no PDF is rendered, but it is NOT revoked: nothing
 * is written, so it works again the moment the subscription does. Checked
 * last, so an expired or unknown link still says so.
 */
export async function resolveShareToken(token: string): Promise<ShareLookup> {
  // Guard against an empty/absurd token reaching the database as a wildcard-ish
  // lookup. Tokens are 32 random bytes in base64url (43 chars).
  if (!token || token.length < 20 || token.length > 200) return { ok: false, reason: 'NOT_FOUND' };

  const report = await prisma.report_b8.findUnique({
    where: { shareToken: token },
    select: {
      id: true,
      organizationId: true,
      title: true,
      description: true,
      sections: true,
      config: true,
      createdAt: true,
      shareExpiresAt: true,
    },
  });

  if (!report) return { ok: false, reason: 'NOT_FOUND' };
  if (report.shareExpiresAt && report.shareExpiresAt.getTime() < Date.now()) {
    return { ok: false, reason: 'EXPIRED' };
  }
  if (!(await requireActiveAccess(report.organizationId)).allowed) {
    return { ok: false, reason: 'UNAVAILABLE' };
  }
  return { ok: true, report };
}
