import { ok } from '@/lib/api';
import { getEfficiency } from '@/lib/operations-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  return ok(getEfficiency());
}
