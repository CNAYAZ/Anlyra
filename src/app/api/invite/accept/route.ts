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

  // Create membership (idempotent) and mark invite accepted.
  await prisma.membership.upsert({
    where: { userId_organizationId: { userId, organizationId: invite.organizationId } },
    update: { role: invite.role },
    create: { userId, organizationId: invite.organizationId, role: invite.role },
  });
  await prisma.invite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date() },
  });

  return NextResponse.json({ success: true, organizationId: invite.organizationId });
}
