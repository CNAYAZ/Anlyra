import { ok } from '@/lib/api';
import { getCustomers } from '@/lib/operations-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  return ok(getCustomers());
}
