import { ok } from '@/lib/api';
import { getEfficiency } from '@/lib/operations-data';
import { MARKET_AND_OPERATIONS_AVAILABLE, marketOperationsUnavailable } from '@/lib/market-operations-availability';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!MARKET_AND_OPERATIONS_AVAILABLE) return marketOperationsUnavailable();
  return ok(getEfficiency());
}
