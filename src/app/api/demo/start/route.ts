import { NextResponse } from 'next/server';
import { DEMO_COOKIE } from '@/lib/session';

export const dynamic = 'force-dynamic';

/** How long an explicit demo visit lasts before the visitor lands on /login again. */
const DEMO_SESSION_HOURS = 12;

/**
 * POST /api/demo/start — the one way into the demo.
 *
 * Sets DEMO_COOKIE and nothing else: no user is signed in, no NextAuth session
 * is created, no record is written. That is the point — a demo visitor stays
 * ANONYMOUS, so every mutation route (which resolves identity through
 * getAuthContext) already answers 401 without needing to know the demo exists.
 *
 * Cookie flags: httpOnly so page scripts cannot read or set it, sameSite 'lax'
 * so it survives the navigation that follows the click but is not sent from
 * third-party contexts, and secure in production. It carries a constant '1' —
 * never an id — so there is nothing in it to tamper with in a way that could
 * point at a different organization.
 *
 * POST rather than GET on purpose: a GET would be followed by link prefetchers
 * and crawlers, quietly handing a demo session to visitors who never asked.
 */
export async function POST() {
  const res = NextResponse.json({ success: true, data: { started: true } });
  res.cookies.set(DEMO_COOKIE, '1', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: DEMO_SESSION_HOURS * 60 * 60,
  });
  return res;
}

/**
 * DELETE /api/demo/start — leave the demo.
 *
 * Needed because the demo visitor has no session to sign out of: without this,
 * the only way back to a normal anonymous state would be clearing cookies by
 * hand. The logout route handles real sessions and does not know about this one.
 */
export async function DELETE() {
  const res = NextResponse.json({ success: true, data: { started: false } });
  res.cookies.delete(DEMO_COOKIE);
  return res;
}
