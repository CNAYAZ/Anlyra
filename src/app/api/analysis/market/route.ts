import { ok, failFromError } from '@/lib/api';
import { getMarketSummary } from '@/lib/market-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const summary = await getMarketSummary();
    return ok(summary);
  } catch (e) {
    // Was fail((e as Error).message, 500) — forwarded the raw error text to
    // the client (getCurrentContext()'s own message, e.g. 'Anonymous visitor
    // without an explicit demo session') and always answered 500, even for an
    // anonymous caller. failFromError maps by error NAME instead: 401 for no
    // session, 403 for signed-in-without-organization, and otherwise a fixed
    // 'INTERNAL_ERROR' with the real error only in the server log.
    return failFromError(e);
  }
}
