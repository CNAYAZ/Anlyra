import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { DEMO_EMAIL } from '@/lib/session';
import { generateToken, siteUrl } from '@/lib/auth/tokens';
import { sendEmail, teamInviteTemplate, welcomeTemplate, sanitizeSubjectText } from '@/lib/email';
import { signupCredits } from '@/lib/billing/plan-credits';
import { COMPANY } from '@/lib/company';
import { checkRateLimit } from '@/lib/rate-limit';
import { authRateLimitResponse } from '@/lib/api/rate-limit-response';
import { hasControlChars } from '@/lib/validation/display-name';

const TRIAL_DAYS = 7;
const INVITE_EXPIRY_HOURS = 72;
const VALID_ROLES = ['admin', 'editor', 'viewer'];

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'org'
  );
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  // This is the one write route in the product that does NOT resolve its
  // organization through getAuthContext()/requireWritableOrg — deliberately,
  // because it is the route a brand-new user with NO organization yet must
  // still be able to reach (getAuthContext() returns null for exactly that
  // user, "signed in but no org yet"). That also means the usual
  // requireWritableOrg(organizationId) check has no organization to test:
  // there is not one yet, we are creating one. So the demo account is
  // recognized by IDENTITY here — the session's own email against the known
  // demo address — the same thing requireWritableOrg exists to prevent
  // (demo@pro.app is a real user row with a real password; anyone signed in
  // as it must not be able to write, and creating a new organization is the
  // one write this route previously left open to it).
  if (session?.user?.email?.toLowerCase() === DEMO_EMAIL) {
    return NextResponse.json({ error: 'DEMO_READ_ONLY' }, { status: 403 });
  }

  // Rate limit per user. This route sends ONE INVITE EMAIL PER ENTRY of a
  // caller-supplied array, to arbitrary addresses, with the inviter's name in
  // the subject — i.e. a spam cannon with a legitimate return address, and it
  // had no limiter of any kind. FAIL-CLOSED, because the cost of an outage here
  // is measured in sent email and sender reputation.
  const rl = await checkRateLimit('onboarding-user', userId);
  if (!rl.success) return authRateLimitResponse(rl);

  let body: {
    name?: string;
    vatNumber?: string;
    industry?: string;
    teamSize?: string;
    invites?: { email: string; role?: string }[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const name = (body.name || '').trim();
  if (!name) {
    return NextResponse.json({ error: 'NAME_REQUIRED' }, { status: 400 });
  }
  // No cap and no character filter previously existed here at all — unlike
  // settings/organization's PATCH (same Organization.name column,
  // z.string().min(1).max(120)). Matching that route's cap here, plus the
  // control-character rule shared with it: this becomes org.name, later shown
  // to other people this org invites (team-invite email) and in bug reports.
  if (name.length > 120 || hasControlChars(name)) {
    return NextResponse.json({ error: 'INVALID_NAME' }, { status: 400 });
  }

  // Ensure a unique slug.
  const base = slugify(name);
  let slug = base;
  let i = 1;
  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${base}-${i++}`;
  }

  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  const org = await prisma.organization.create({
    data: {
      name,
      slug,
      vatNumber: body.vatNumber?.trim() || null,
      industry: body.industry?.trim() || 'Generale',
      teamSize: body.teamSize || null,
      // Credits follow the PLAN, not a fixed schema default. Previously this
      // field was left unset, so every new org silently inherited the schema's
      // @default(100) regardless of plan.
      aiCredits: signupCredits(),
      setupCompletedAt: now,
      trialStartedAt: now,
      trialEndsAt,
      memberships: {
        create: { userId, role: 'admin', isDefault: true },
      },
    },
  });

  // Demote any prior default membership for this user so the new org becomes active.
  await prisma.membership.updateMany({
    where: { userId, organizationId: { not: org.id }, isDefault: true },
    data: { isDefault: false },
  });

  // Create + send invites (best-effort).
  const inviter = await prisma.user.findUnique({ where: { id: userId } });
  const inviterSubjectName = inviter?.name ? sanitizeSubjectText(inviter.name) : '';
  // Cap the batch. The rate limit above bounds how OFTEN this route runs, but a
  // single call iterates the caller's array and sends one email per entry — so
  // without a cap, 3 permitted calls could still mean 30 000 emails. The limiter
  // and this cap only work as a pair; neither alone bounds the sends.
  // 20 is above any plausible onboarding team and far below abuse.
  const MAX_INVITES_PER_REQUEST = 20;
  const invites = (body.invites || [])
    .filter((inv) => inv.email && /\S+@\S+\.\S+/.test(inv.email))
    .slice(0, MAX_INVITES_PER_REQUEST);
  for (const inv of invites) {
    const role = VALID_ROLES.includes(inv.role || '') ? (inv.role as string) : 'viewer';
    const token = generateToken();
    await prisma.invite.create({
      data: {
        email: inv.email.trim().toLowerCase(),
        organizationId: org.id,
        invitedById: userId,
        role,
        token,
        expiresAt: new Date(now.getTime() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000),
      },
    });
    await sendEmail({
      to: inv.email,
      // inviterSubjectName is free text the inviter typed for themselves
      // (profile name), landing directly in the Subject header of an email
      // sent to someone else — sanitizeSubjectText strips control characters/
      // newlines (header-injection risk, e.g. a name ending in a line break
      // followed by "Bcc: ...") and caps the length; it does not need
      // HTML-escaping, the Subject header is not HTML. Sanitized BEFORE the
      // fallback check, not after, so a name that is control characters
      // through and through (sanitizes down to empty) still falls back to
      // "Un collega" instead of leaving a blank in the subject.
      subject: `${inviterSubjectName || 'Un collega'} ti ha invitato su Anlyra`,
      html: teamInviteTemplate({
        inviterName: inviter?.name || inviter?.email || 'Un collega',
        inviterEmail: inviter?.email || COMPANY.noreplyEmail,
        orgName: org.name,
        userEmail: inv.email,
        inviteUrl: `${siteUrl()}/it/invite/${token}`,
        expiryHours: INVITE_EXPIRY_HOURS,
      }),
    }).catch(() => {});
  }

  // Welcome email now that setup is complete (best-effort).
  if (inviter?.email) {
    await sendEmail({
      to: inviter.email,
      subject: 'Benvenuto in Anlyra — iniziamo',
      html: welcomeTemplate({
        userName: inviter.name || inviter.email,
        userEmail: inviter.email,
        loginUrl: `${siteUrl()}/it/overview`,
      }),
    }).catch(() => {});
  }

  return NextResponse.json({ success: true, organizationId: org.id });
}
