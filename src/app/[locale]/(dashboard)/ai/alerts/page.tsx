export const dynamic = 'force-dynamic';

import { AlertsPageClient } from './AlertsPageClient';
import { getCurrentContext } from '@/lib/session';
import { getCreditBalance } from '@/lib/billing/repository';

/**
 * Server wrapper so this page reads a FRESH credit balance on every visit —
 * mirroring (dashboard)/ai/chat/page.tsx, which already does this
 * (`org.aiCredits` fetched in its own server component, passed down as
 * `initialCredits`). Before this, the page was 'use client' end to end and
 * relied ENTIRELY on the dashboard LAYOUT's one-time hydration of the shared
 * credits store: correct at the moment of a hard page load, but the layout
 * does not re-run on client-side navigation between dashboard pages, so a
 * balance that changed another way after that (a top-up from the admin
 * panel, the monthly renewal cron, a purchase, another browser tab) would
 * keep showing the OLD number here — including in the "Analizza con AI" gate
 * inside AlertDetail — until an unrelated mutation happened to refresh it or
 * the user did a hard reload.
 *
 * getCreditBalance is the same read `(dashboard)/layout.tsx` uses for the
 * topbar counter — reusing it here (rather than a second ad-hoc Prisma query,
 * as chat's page does) keeps this page and the layout reading the identical
 * source, not just an equivalent one.
 */
export default async function AlertsPage() {
  const { organizationId } = await getCurrentContext();
  const credits = await getCreditBalance(organizationId);

  return <AlertsPageClient initialCredits={credits} />;
}
