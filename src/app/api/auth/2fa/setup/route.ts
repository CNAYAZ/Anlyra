import { NextResponse } from 'next/server';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;
  const email = session?.user?.email;
  if (!userId || !email) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const secret = speakeasy.generateSecret({ name: `Anlyra:${email}` });

  // Store the (not-yet-enabled) secret so /verify can confirm against it.
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorSecret: secret.base32 },
  });

  const qrCode = secret.otpauth_url ? await QRCode.toDataURL(secret.otpauth_url) : null;

  return NextResponse.json({ qrCode, secret: secret.base32 });
}
