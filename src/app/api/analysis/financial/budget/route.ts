import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { fail, ok } from '@/lib/api/response';
import { getOrgData } from '@/lib/api/financial-query';

const schema = z.object({
  period: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const parsed = schema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!parsed.success) return fail(parsed.error.message, 422);

    const data = await getOrgData();
    const periods = Array.from(new Set(data.budget.map((b) => b.period))).sort();
    const target = parsed.data.period ?? periods.at(-1) ?? '';
    const rows = data.budget
      .filter((b) => b.period === target)
      .map((b) => ({
        id: b.id,
        category: b.category,
        planned: b.planned,
        actual: b.actual,
        diff: b.actual - b.planned,
        usage: b.planned > 0 ? (b.actual / b.planned) * 100 : 0,
      }))
      .sort((a, b) => b.planned - a.planned);

    return ok({ period: target, periods, rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return fail(message === 'Unauthorized' ? 'Unauthorized' : 'Internal error', message === 'Unauthorized' ? 401 : 500);
  }
}
