import { ok, fail } from '@/lib/api';
import { getMarketSummary } from '@/lib/market-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const summary = await getMarketSummary();
    return ok(summary);
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
