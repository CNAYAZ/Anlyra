export const dynamic = 'force-dynamic';

import { TrendingUp } from 'lucide-react';
import { PagePlaceholder } from '@/components/PagePlaceholder';

export default function FinanceOverviewPage() {
  return <PagePlaceholder pageKey="finance" icon={TrendingUp} />;
}