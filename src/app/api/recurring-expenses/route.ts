import { z } from 'zod';
import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentContext } from '@/lib/session';
import { toRecurringExpenseDTO, computeTotals } from '@/lib/recurring-expenses/dto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CreateSchema = z.object({
  vendorName: z.string().trim().min(1).max(200),
  amount: z.number().positive(),
  currency: z.string().trim().min(1).max(8).optional(),
  frequency: z.enum(['MONTHLY', 'YEARLY']).optional(),
  category: z.string().trim().max(100).optional(),
  nextRenewal: z.coerce.date().optional(),
  notes: z.string().trim().max(2000).optional(),
});

// GET /api/recurring-expenses — list for the current org plus normalised
// monthly/yearly totals computed over the full dataset (active expenses only).
export async function GET() {
  try {
    const { organizationId } = await getCurrentContext();

    const rows = await prisma.recurringExpense.findMany({
      where: { organizationId },
      orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
    });

    const totals = computeTotals(rows);
    const expenses = rows.map(toRecurringExpenseDTO);

    return ok({ expenses, totals });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}

// POST /api/recurring-expenses — create. organizationId is taken from the
// session only, never from the payload.
export async function POST(req: Request) {
  try {
    const { organizationId } = await getCurrentContext();
    const json = await req.json().catch(() => null);
    const parsed = CreateSchema.safeParse(json);
    if (!parsed.success) return fail('INVALID_INPUT', 400);
    const p = parsed.data;

    const created = await prisma.recurringExpense.create({
      data: {
        organizationId,
        vendorName: p.vendorName,
        amount: p.amount,
        currency: (p.currency ?? 'EUR').toUpperCase(),
        frequency: p.frequency ?? 'MONTHLY',
        category: p.category ?? null,
        nextRenewal: p.nextRenewal ?? null,
        notes: p.notes ?? null,
      },
    });

    return ok({ expense: toRecurringExpenseDTO(created) });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
