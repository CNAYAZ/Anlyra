import type { NextRequest } from 'next/server';

/**
 * Costruisce una URL assoluta usando l'host pubblico visto dal browser.
 *
 * Tenta in ordine 3 fonti per identificare il dominio pubblico corretto:
 * 1. x-forwarded-host header (Vercel, Cloudflare, Nginx reverse proxy standard)
 * 2. host header (Codespace, host header browser-native quando non viene riscritto)
 * 3. req.nextUrl.origin fallback (sviluppo localhost diretto)
 *
 * Per il protocollo usiamo sempre inferProtocol() come validazione finale:
 * - https se il proxy dice https (x-forwarded-proto: https)
 * - https se il dominio è noto come pubblico (.app.github.dev, .vercel.app, ecc.)
 * - https per qualsiasi host non-localhost (più sicuro come default)
 * - http solo per localhost/127.x in sviluppo diretto
 *
 * Nota: Next.js dev server converte Host → X-Forwarded-Host internamente e imposta
 * X-Forwarded-Proto dalla connessione TCP interna (http). inferProtocol() corregge
 * il protocollo per domini pubblici anche quando la connessione interna è HTTP.
 */
export function buildPublicUrl(path: string, req: NextRequest): URL {
  const forwardedHost = req.headers.get('x-forwarded-host');
  const forwardedProto = req.headers.get('x-forwarded-proto');
  const hostHeader = req.headers.get('host');

  // 1° tentativo: x-forwarded-host (proxy standard o Next.js dev da Host header)
  if (forwardedHost) {
    // x-forwarded-proto può essere 'http' se la connessione interna è plain HTTP
    // (tipico in Codespace/container). Usiamo inferProtocol per correggere.
    const proto = forwardedProto === 'https' ? 'https' : inferProtocol(forwardedHost);
    return new URL(path, `${proto}://${forwardedHost}`);
  }

  // 2° tentativo: host header (browser native quando proxy non aggiunge x-forwarded-host)
  if (hostHeader && !hostHeader.startsWith('localhost') && !hostHeader.startsWith('127.0.0.1')) {
    const proto = forwardedProto === 'https' ? 'https' : inferProtocol(hostHeader);
    return new URL(path, `${proto}://${hostHeader}`);
  }

  // 3° fallback: localhost diretto in sviluppo
  return new URL(path, req.nextUrl.origin);
}

function inferProtocol(host: string): 'http' | 'https' {
  if (host.includes('.app.github.dev')) return 'https';
  if (host.includes('.vercel.app')) return 'https';
  if (host.includes('.netlify.app')) return 'https';
  if (host.includes('.cloudflare')) return 'https';
  // Default HTTPS per host non-localhost (più sicuro)
  if (!host.startsWith('localhost') && !host.startsWith('127.')) return 'https';
  return 'http';
}
