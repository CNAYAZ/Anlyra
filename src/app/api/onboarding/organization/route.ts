import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { DEMO_EMAIL } from '@/lib/session';
import { siteUrl } from '@/lib/auth/tokens';
import { sendEmail, welcomeTemplate } from '@/lib/email';
import { issueTeamInvite } from '@/lib/invites/issue';
import { signupCredits } from '@/lib/billing/plan-credits';
import { checkRateLimit } from '@/lib/rate-limit';
import { authRateLimitResponse } from '@/lib/api/rate-limit-response';
import { hasControlChars } from '@/lib/validation/display-name';

const TRIAL_DAYS = 7;

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
        // 'owner', not 'admin': the person creating the organization is its
        // owner. Billing (portal, checkout) is being restricted to 'owner'
        // only — a creator left at 'admin' would be locked out of their own
        // organization's billing the moment that restriction ships.
        create: { userId, role: 'owner', isDefault: true },
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
  // Cap the batch. The rate limit above bounds how OFTEN this route runs, but a
  // single call iterates the caller's array and sends one email per entry — so
  // without a cap, 3 permitted calls could still mean 30 000 emails. The limiter
  // and this cap only work as a pair; neither alone bounds the sends.
  // 20 is above any plausible onboarding team and far below abuse.
  const MAX_INVITES_PER_REQUEST = 20;
  // Drop the creator's OWN address from the invite list before anything else
  // is created. Without this, a creator who mistypes their own email into the
  // invite form gets a real Invite row addressed to themselves; clicking it
  // later hits invite/accept, which used to overwrite an existing membership's
  // role with the invite's role — silently demoting the owner in their own
  // organization (see the accept route below for the other half of that
  // trap). Excluding it here means the trap can no longer be walked into from
  // this side, regardless of what accept does; skipped, not rejected: the
  // rest of a well-formed batch still goes out.
  const creatorEmail = inviter?.email?.toLowerCase();
  const rawInvites = body.invites || [];
  const invites = rawInvites
    .filter((inv) => inv.email && /\S+@\S+\.\S+/.test(inv.email))
    .filter((inv) => !creatorEmail || inv.email.trim().toLowerCase() !== creatorEmail)
    .slice(0, MAX_INVITES_PER_REQUEST);
  const skippedSelfInvite =
    !!creatorEmail && rawInvites.some((inv) => inv.email?.trim().toLowerCase() === creatorEmail);
  if (skippedSelfInvite) {
    // No user-facing UI reads this today (the onboarding page discards the
    // response body and redirects to /overview on any 2xx — see the report
    // for this commit). Logged so it is at least visible server-side, and the
    // response field is there for when that page is revisited.
    console.warn(`[onboarding/organization] org ${org.id}: creator ${creatorEmail} was in their own invite list — skipped`);
  }
  for (const inv of invites) {
    // Token generation, the 72h expiry, the role whitelist, the email template
    // and the logging of a failed delivery all live in issueTeamInvite
    // (src/lib/invites/issue.ts), shared with POST /api/settings/team/invite so
    // there is only one copy of them.
    await issueTeamInvite({
      organizationId: org.id,
      orgName: org.name,
      inviterId: userId,
      inviterName: inviter?.name ?? null,
      inviterEmail: inviter?.email ?? null,
      email: inv.email,
      role: inv.role || '',
    });
  }

  // Welcome email now that setup is complete (best-effort).
  if (inviter?.email) {
    const welcomeSendResult = await sendEmail({
      to: inviter.email,
      subject: 'Benvenuto in Anlyra — iniziamo',
      html: welcomeTemplate({
        userName: inviter.name || inviter.email,
        userEmail: inviter.email,
        loginUrl: `${siteUrl()}/it/overview`,
      }),
    });
    if (!welcomeSendResult.success) {
      console.error('[email] welcome failed', { to: inviter.email, reason: welcomeSendResult.error });
    }
  }

  return NextResponse.json({ success: true, organizationId: org.id, skippedSelfInvite });
}
