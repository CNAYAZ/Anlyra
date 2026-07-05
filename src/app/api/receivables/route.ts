import { z } from 'zod';
import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentContext, getAuthContext } from '@/lib/session';
import { toReceivableDTO } from '@/lib/receivables/dto';
import type { ReceivableStatus, ReceivableTotals } from '@/types/receivable';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CreateSchema = z.object({
  customerName: z.string().trim().min(1).max(200),
  customerEmail: z.string().trim().email().max(320).optional(),
  amount: z.number().positive(),
  currency: z.string().trim().min(1).max(8).optional(),
  invoiceNumber: z.string().trim().max(100).optional(),
  issuedDate: z.coerce.date().optional(),
  dueDate: z.coerce.date(),
  notes: z.string().trim().max(2000).optional(),
});

// GET /api/receivables?status=OPEN|PAID|OVERDUE
// Returns all receivables for the current org, with status computed at runtime
// (OPEN past its dueDate is reported as OVERDUE). Filtering, when requested, is
// applied to the EFFECTIVE status so it matches what the user sees.
export async function GET(req: Request) {
  try {
    const { organizationId } = await getCurrentContext();
    const url = new URL(req.url);
    const statusFilter = url.searchParams.get('status');

    const rows = await prisma.receivable.findMany({
      where: { organizationId },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });

    const now = new Date();
    const all = rows.map((r) => toReceivableDTO(r, now));

    // Totals reflect the full dataset, independent of the active filter.
    // openAmount/overdueAmount sum `amount` as-is across rows regardless of
    // currency (same simplification already used for recurring-expenses totals).
    const openAmount = all.filter((i) => i.status === 'OPEN').reduce((sum, i) => sum + i.amount, 0);
    const overdueAmount = all.filter((i) => i.status === 'OVERDUE').reduce((sum, i) => sum + i.amount, 0);
    const totals: ReceivableTotals = {
      open: all.filter((i) => i.status === 'OPEN').length,
      overdue: all.filter((i) => i.status === 'OVERDUE').length,
      openAmount,
      overdueAmount,
      // Everything still unpaid (not-yet-due + overdue), so the card's total is
      // always ≥ the overdue subtotal shown beneath it.
      outstandingAmount: openAmount + overdueAmount,
    };

    const validFilters: ReceivableStatus[] = ['OPEN', 'PAID', 'OVERDUE'];
    const items =
      statusFilter && validFilters.includes(statusFilter as ReceivableStatus)
        ? all.filter((i) => i.status === statusFilter)
        : all;

    return ok({ receivables: items, totals });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}

// POST /api/receivables — create a receivable. organizationId is taken from the
// session only, never from the payload.
export async function POST(req: Request) {
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) return fail('Unauthorized', 401);
    const { organizationId } = authCtx;
    const json = await req.json().catch(() => null);
    const parsed = CreateSchema.safeParse(json);
    if (!parsed.success) return fail('INVALID_INPUT', 400);
    const p = parsed.data;

    const created = await prisma.receivable.create({
      data: {
        organizationId,
        customerName: p.customerName,
        customerEmail: p.customerEmail ?? null,
        amount: p.amount,
        currency: (p.currency ?? 'EUR').toUpperCase(),
        invoiceNumber: p.invoiceNumber ?? null,
        issuedDate: p.issuedDate ?? null,
        dueDate: p.dueDate,
        notes: p.notes ?? null,
      },
    });

    // Re-read from DB (the create result is already the persisted row).
    return ok({ receivable: toReceivableDTO(created) });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
