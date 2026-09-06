import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  const userEmail = session?.user?.email?.toLowerCase();
  if (!userId || !userEmail) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const token = body.token || '';
  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    return NextResponse.json({ error: 'INVITE_INVALID' }, { status: 400 });
  }
  if (invite.email.toLowerCase() !== userEmail) {
    return NextResponse.json({ error: 'EMAIL_MISMATCH' }, { status: 403 });
  }

  // Create the membership if this is a NEW member — but if the person is
  // ALREADY a member of this organization, never touch their role. The old
  // code here was an upsert with `update: { role: invite.role }`, which
  // overwrote an existing membership's role with whatever role the invite
  // carried. Combined with the onboarding route creating an invite addressed
  // to the CREATOR's own email (fixed above), that upsert is how an owner
  // could accept their own invite and be silently demoted to 'viewer' in
  // their own organization — a real incident, referenced in
  // admin/actions.ts's unblockAccount doc comment. An invite can only ever
  // grant membership to someone who doesn't have it yet; it must never be
  // able to change the standing of someone who already does.
  const existingMembership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId: invite.organizationId } },
  });
  if (!existingMembership) {
    await prisma.membership.create({
      data: { userId, organizationId: invite.organizationId, role: invite.role },
    });
  }
  // The invite is marked accepted either way. For an already-existing member
  // it did not change anything, but it still served its purpose (the link was
  // used, correctly, by the person it was addressed to) and leaving it
  // pending would keep a stale, clickable link valid for up to 72 hours for
  // no further effect — accepted-but-no-op is the honest state, not
  // unaccepted.
  await prisma.invite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date() },
  });

  return NextResponse.json({ success: true, organizationId: invite.organizationId });
}
