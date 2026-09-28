import { NextRequest, NextResponse } from "next/server";
import { ok, fail } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/session";
import { requireWritableOrg } from "@/lib/auth/require-writable";
import { isOwnerRole, requireOwnerRole } from "@/lib/auth/require-role";
import { auditLog } from "@/lib/audit/log";
import {
  ACCEPTED_BILLING_COUNTRIES,
  BILLING_SELECT,
  billingInputFromOrganization,
  checkStoredBillingDetails,
  organizationColumnsFromBilling,
  validateBillingDetails,
  type BillingDetailsInput,
} from "@/lib/billing/billing-details";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The organization's invoicing data (see @/lib/billing/billing-details).
 * GET: every member reads it — the billing page shows it to all, editable
 * only by the owner. PUT: owner only, like every other billing action.
 */
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return fail("Unauthenticated", 401);

  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: BILLING_SELECT,
  });
  if (!org) return fail("NOT_FOUND", 404);

  return ok({
    details: billingInputFromOrganization(org),
    complete: checkStoredBillingDetails(org).ok,
    canEdit: isOwnerRole(ctx.role),
    acceptedCountries: ACCEPTED_BILLING_COUNTRIES,
  });
}

export async function PUT(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return fail("Unauthenticated", 401);
  // Demo organization: read-only. See requireWritableOrg.
  const readOnly = requireWritableOrg(ctx.organizationId);
  if (readOnly) return readOnly;
  // Billing is owner-only. See requireOwnerRole.
  const denied = requireOwnerRole(ctx);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid request body", 400);
  }
  if (!body || typeof body !== "object") return fail("Invalid request body", 400);

  const result = validateBillingDetails(body as BillingDetailsInput);
  if (!result.ok) {
    // One stable code per wrong field, so the form can mark each one; the
    // interface turns the codes into sentences (billing.details.errors.*).
    return NextResponse.json(
      { success: false, error: "BILLING_DETAILS_INVALID", fields: result.errors },
      { status: 400 },
    );
  }

  await prisma.organization.update({
    where: { id: ctx.organizationId },
    data: organizationColumnsFromBilling(result.data),
  });

  await auditLog({
    action: "billing.details_update",
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    targetType: "organization",
    targetId: ctx.organizationId,
    req,
    // The country only — never the values, which are company data.
    metadata: { country: result.data.country },
  });

  return ok({ details: billingInputFromOrganization(organizationColumnsFromBilling(result.data)), complete: true });
}
