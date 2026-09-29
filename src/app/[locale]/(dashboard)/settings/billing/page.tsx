import { redirect } from 'next/navigation';

/**
 * The old single billing page, split into Abbonamento, Crediti and Dati di
 * fatturazione (founder's decision). The address must keep working: emails
 * already sent link here, and both Stripe checkouts still come back here
 * (success_url / cancel_url in api/billing/checkout and
 * api/billing/credits/checkout, deliberately not changed). Every query
 * parameter is carried over, so the page it lands on still shows the return
 * from Stripe:
 *   ?credits=1  (credit pack paid)   → Crediti
 *   ?success=1  (subscription paid)  → Abbonamento
 *   ?canceled=1 (either checkout)    → Abbonamento — the cancel URL is the
 *                                      same for both checkouts, so which one
 *                                      was abandoned cannot be told from it
 *   nothing                          → Abbonamento (what the page opened on)
 */
export default async function OldBillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const kept = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) kept.append(key, v);
  }
  const target = query.credits === '1' ? 'credits' : 'subscription';
  const qs = kept.toString();
  redirect(`/${locale}/settings/${target}${qs ? `?${qs}` : ''}`);
}
