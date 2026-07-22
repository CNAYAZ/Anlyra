import { makeStubProvider } from "@/lib/sync/providers/stub";

// The Stripe sync provider is NOT implemented yet. It previously fabricated
// random FinancialRecord rows (Math.random amounts/dates) and wrote them to the
// database, which polluted real financial data while pretending a sync happened.
// Until a real Stripe API integration exists, this behaves like every other
// unimplemented provider: it writes nothing and fails honestly, so the sync
// manager records the failure in SyncLog.
//
// NOTE: this is the DATA-SYNC integration, unrelated to the real Stripe billing
// under /api/billing/*, /api/webhooks/stripe and src/lib/billing/* — do not merge.
export const stripeProvider = makeStubProvider("stripe");
