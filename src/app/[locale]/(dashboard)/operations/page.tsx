export const dynamic = 'force-dynamic';

import { Activity } from 'lucide-react';
import { PagePlaceholder } from '@/components/PagePlaceholder';

export default function OperationsOverviewPage() {
  return <PagePlaceholder pageKey="operations" icon={Activity} />;
}