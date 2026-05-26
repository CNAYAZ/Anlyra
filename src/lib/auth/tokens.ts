import { randomBytes } from 'crypto';

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

export function generateBackupCodes(count = 10): string[] {
  return Array.from({ length: count }, () => randomBytes(5).toString('hex'));
}

export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.AUTH_URL ||
    process.env.NEXTAUTH_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
}
