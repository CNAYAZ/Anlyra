export const dynamic = 'force-dynamic';

import { Globe } from 'lucide-react';
import { PagePlaceholder } from '@/components/PagePlaceholder';

export default function MarketOverviewPage() {
  return <PagePlaceholder pageKey="market" icon={Globe} />;
}