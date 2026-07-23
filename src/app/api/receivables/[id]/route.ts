import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/session';
import { requireManagerRole } from '@/lib/auth/require-role';
import { toReceivableDTO } from '@/lib/receivables/dto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PatchSchema = z.object({
  status: z.enum(['OPEN', 'PAID', 'OVERDUE']).optional(),
  customerName: z.string().trim().min(1).max(200).optional(),
  customerEmail: z.string().trim().email().max(320).nullable().optional(),
  amount: z.number().positive().optional(),
  currency: z.string().trim().min(1).max(8).optional(),
  invoiceNumber: z.string().trim().max(100).nullable().optional(),
  issuedDate: z.coerce.date().nullable().optional(),
  dueDate: z.coerce.date().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

// PATCH /api/receivables/[id] — update a receivable (primarily to mark it PAID,
// which also stamps paidAt). Ownership is verified against the session org.
export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) return fail('Unauthorized', 401);
    const { organizationId } = authCtx;
    const json = await req.json().catch(() => null);
    const parsed = PatchSchema.safeParse(json);
    if (!parsed.success) return fail('INVALID_INPUT', 400);
    const p = parsed.data;

    const existing = await prisma.receivable.findFirst({
      where: { id: ctx.params.id, organizationId },
    });
    if (!existing) return fail('NOT_FOUND', 404);

    const data: Prisma.ReceivableUpdateInput = {};
    if (p.customerName !== undefined) data.customerName = p.customerName;
    if (p.customerEmail !== undefined) data.customerEmail = p.customerEmail;
    if (p.amount !== undefined) data.amount = p.amount;
    if (p.currency !== undefined) data.currency = p.currency.toUpperCase();
    if (p.invoiceNumber !== undefined) data.invoiceNumber = p.invoiceNumber;
    if (p.issuedDate !== undefined) data.issuedDate = p.issuedDate;
    if (p.dueDate !== undefined) data.dueDate = p.dueDate;
    if (p.notes !== undefined) data.notes = p.notes;
    if (p.status !== undefined) {
      data.status = p.status;
      // PAID stamps paidAt; reverting to OPEN/OVERDUE clears it.
      data.paidAt = p.status === 'PAID' ? new Date() : null;
    }

    if (Object.keys(data).length === 0) return fail('INVALID_INPUT', 400);

    const updated = await prisma.receivable.update({
      where: { id: existing.id },
      data,
    });

    return ok({ receivable: toReceivableDTO(updated) });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}

// DELETE /api/receivables/[id] — remove a receivable. Ownership verified.
export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) return fail('Unauthorized', 401);
    const denied = requireManagerRole(authCtx);
    if (denied) return denied;
    const { organizationId } = authCtx;
    const existing = await prisma.receivable.findFirst({
      where: { id: ctx.params.id, organizationId },
    });
    if (!existing) return fail('NOT_FOUND', 404);

    await prisma.receivable.delete({ where: { id: existing.id } });
    return ok({ id: existing.id });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
