import { ok } from '@/lib/api';
import { getTeam } from '@/lib/operations-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  return ok(getTeam());
}
