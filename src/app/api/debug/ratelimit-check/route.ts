import { NextResponse } from 'next/server';

// TEMPORARY diagnostic endpoint — REMOVE after diagnosing the Upstash env issue.
// Reveals ONLY presence/length of the Upstash env vars (never the values) and
// whether the Redis client can be constructed at runtime on Vercel.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? '';
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? '';

  let redisInit: string = 'ok';
  try {
    // Import lazily so a failure here is reported, not thrown at module load.
    const { Redis } = await import('@upstash/redis');
    // Constructing requires a non-empty url/token; this surfaces config errors
    // without ever performing a network call or exposing secrets.
    new Redis({ url, token });
  } catch (err) {
    redisInit = `error: ${err instanceof Error ? err.message : String(err)}`;
  }

  return NextResponse.json({
    hasUrl: url.length > 0,
    hasToken: token.length > 0,
    urlLength: url.length,
    tokenLength: token.length,
    urlStartsWithHttps: url.startsWith('https://'),
    nodeEnv: process.env.NODE_ENV ?? '',
    runtime: 'nodejs',
    redisInit,
  });
}
