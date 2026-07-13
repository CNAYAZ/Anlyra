import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { generateToken, siteUrl } from '@/lib/auth/tokens';
import { sendEmail, teamInviteTemplate, welcomeTemplate } from '@/lib/email';

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
  const invites = (body.invites || []).filter((inv) => inv.email && /\S+@\S+\.\S+/.test(inv.email));
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
      subject: `${inviter?.name || 'Un collega'} ti ha invitato su Anlyra`,
      html: teamInviteTemplate({
        inviterName: inviter?.name || inviter?.email || 'Un collega',
        inviterEmail: inviter?.email || 'noreply@anlyra.com',
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
