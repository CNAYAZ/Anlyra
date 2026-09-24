import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { fail, ok } from '@/lib/api/response';
import { failFromError } from '@/lib/api';
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
    // Was comparing err.message === 'Unauthorized' — but getCurrentContext()
    // throws NotAuthenticatedError with message 'Anonymous visitor without an
    // explicit demo session' (src/lib/session.ts), never the literal string
    // 'Unauthorized', so that comparison never matched and every anonymous
    // request fell through to 500 Internal error. failFromError (src/lib/api.ts,
    // already used by ai/insights, receivables and others) maps by error NAME
    // instead, and never forwards the raw message to the client.
    return failFromError(err);
  }
}
