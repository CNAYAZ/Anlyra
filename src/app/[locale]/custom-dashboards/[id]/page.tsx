import { AppShell } from '@/components/layout/AppShell';
import { DashboardView } from './DashboardView';

export const dynamic = 'force-dynamic';

export default function DashboardViewPage({ params }: { params: { id: string } }) {
  return (
    <AppShell>
      <DashboardView id={params.id} />
    </AppShell>
  );
}
