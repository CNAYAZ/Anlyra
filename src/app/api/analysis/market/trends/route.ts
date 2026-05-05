import { ok, fail } from '@/lib/api';
import { getMarketTrends } from '@/lib/market-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const trends = await getMarketTrends();
    return ok({ trends });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
