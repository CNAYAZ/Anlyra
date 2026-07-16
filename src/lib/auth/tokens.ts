import { randomBytes } from 'crypto';

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

export function generateBackupCodes(count = 10): string[] {
  return Array.from({ length: count }, () => randomBytes(5).toString('hex'));
}

export function siteUrl(): string {
  // Trim each candidate so a stray space in an env var (e.g. "https://anlyra.com ")
  // never leaks into generated URLs and breaks verification links. A value made
  // of whitespace only is treated as absent, so the next fallback is used. The
  // fallback order is unchanged.
  const pick = (v: string | undefined): string | undefined => {
    const t = v?.trim();
    return t ? t : undefined;
  };
  return (
    pick(process.env.NEXT_PUBLIC_SITE_URL) ??
    pick(process.env.AUTH_URL) ??
    pick(process.env.NEXTAUTH_URL) ??
    'http://localhost:3000'
  ).replace(/\/$/, '');
}
