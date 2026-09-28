import type Stripe from "stripe";
import { stripeVatValue, type BillingDetails } from "@/lib/billing/billing-details";

/**
 * Copies the organization's invoicing data onto its Stripe customer, so the
 * legal name, address and VAT number appear on Stripe's receipts and invoices.
 *
 * Only the customer record is touched. Automatic tax calculation is NOT
 * enabled anywhere, on purpose: the seller is in the Italian flat-rate regime
 * (regime forfetario) and charges no VAT.
 *
 * Name and address must reach Stripe: a failure there throws, and the caller
 * treats it like any other Stripe failure. The VAT number is best effort:
 * Stripe checks each country's format on its own, and a VAT number it rejects
 * must not stop a payment the product has already validated — the failure is
 * logged, and the founder copies the VAT number from the admin panel anyway.
 */
export async function syncStripeCustomerBilling(
  stripe: Stripe,
  customerId: string,
  details: BillingDetails,
): Promise<void> {
  await stripe.customers.update(customerId, {
    name: details.legalName,
    address: {
      line1: details.address,
      postal_code: details.postalCode,
      city: details.city,
      // Italian province (e.g. "MO"); empty clears it for other countries.
      state: details.province ?? "",
      country: details.country,
    },
  });

  const value = stripeVatValue(details);
  try {
    const existing = await stripe.customers.listTaxIds(customerId, { limit: 100 });
    if (existing.data.some((t) => t.type === "eu_vat" && t.value === value)) return;
    for (const t of existing.data) {
      if (t.type === "eu_vat") await stripe.customers.deleteTaxId(customerId, t.id);
    }
    await stripe.customers.createTaxId(customerId, { type: "eu_vat", value });
  } catch (e) {
    console.error(`[billing] VAT number not saved on Stripe customer ${customerId}:`, e);
  }
}
