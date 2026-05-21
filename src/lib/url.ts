import type { NextRequest } from 'next/server';

/**
 * Costruisce una URL assoluta usando l'host pubblico visto dal browser,
 * non l'host interno del container/server.
 *
 * In ambienti proxy (Codespace, Vercel, Cloudflare, Nginx reverse proxy),
 * req.nextUrl.origin restituisce l'host interno (es. localhost:3000).
 * Gli header X-Forwarded-Host e X-Forwarded-Proto contengono il dominio
 * pubblico visto dal browser.
 *
 * Fallback: se gli header non sono presenti (raro), usa req.nextUrl.origin.
 */
export function buildPublicUrl(path: string, req: NextRequest): URL {
  const forwardedHost = req.headers.get('x-forwarded-host');
  const forwardedProto = req.headers.get('x-forwarded-proto');

  // Codespace, Vercel preview, Cloudflare, reverse proxy in genere
  if (forwardedHost) {
    const proto = forwardedProto || 'https';
    return new URL(path, `${proto}://${forwardedHost}`);
  }

  // Fallback localhost diretto (sviluppo senza proxy)
  return new URL(path, req.nextUrl.origin);
}
