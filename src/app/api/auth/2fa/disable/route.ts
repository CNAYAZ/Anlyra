import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { auditLog } from '@/lib/audit/log';

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  // Password-protected users must confirm; OAuth-only users (no hash) skip it.
  if (user.passwordHash) {
    const password = body.password || '';
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: 'INVALID_PASSWORD' }, { status: 403 });
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorSecret: null,
      twoFactorEnabledAt: null,
      twoFactorBackupCodes: null,
    },
  });

  await auditLog({ action: 'two_factor.disable', userId, req });
  return NextResponse.json({ success: true });
}
