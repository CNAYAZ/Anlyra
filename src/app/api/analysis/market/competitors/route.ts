import { ok, fail } from '@/lib/api';
import { getMarketProfileAndCompetitors } from '@/lib/market-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getMarketProfileAndCompetitors();
    return ok(data);
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
