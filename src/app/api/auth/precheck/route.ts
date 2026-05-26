import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

// Lightweight credential pre-check so the login UI can branch (reveal the 2FA
// field, prompt email verification) before calling NextAuth signIn — which in
// v5 masks all authorize() errors as a generic "CredentialsSignin".
export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ valid: false });
  }

  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';
  if (!email || !password) return NextResponse.json({ valid: false });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) return NextResponse.json({ valid: false });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return NextResponse.json({ valid: false });

  return NextResponse.json({
    valid: true,
    emailVerified: !!user.emailVerifiedAt,
    needs2fa: !!user.twoFactorEnabledAt,
  });
}
