import { z } from 'zod';
import { ok, fail, failFromError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentContext, getAuthContext } from '@/lib/session';
import { requireWritableOrg } from '@/lib/auth/require-writable';
import { requireActiveAccess } from '@/lib/billing/server-gate';
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
    return failFromError(e);
  }
}

// POST /api/recurring-expenses — create. organizationId is taken from the
// session only, never from the payload.
export async function POST(req: Request) {
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) return fail('Unauthorized', 401);
    // Demo organization: read-only. See requireWritableOrg.
    const readOnly = requireWritableOrg(authCtx.organizationId);
    if (readOnly) return readOnly;
    const { organizationId } = authCtx;

    // Expired trial (or past_due) is read-only: block creating a recurring expense.
    const access = await requireActiveAccess(organizationId);
    if (!access.allowed) return fail('TRIAL_EXPIRED', 402);
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
    return failFromError(e);
  }
}
