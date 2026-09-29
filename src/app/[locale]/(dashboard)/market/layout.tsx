import { redirect } from 'next/navigation';
import { MARKET_AND_OPERATIONS_AVAILABLE } from '@/lib/market-operations-availability';

// This section runs on synthetic data, not the company's numbers, and is
// switched off (see src/lib/market-operations-availability.ts): whoever types
// the address by hand goes back to the dashboard. A layout, because the pages
// below are Client Components and cannot redirect on the server themselves.
export default async function MarketLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!MARKET_AND_OPERATIONS_AVAILABLE) redirect(`/${locale}/overview`);
  return <>{children}</>;
}
