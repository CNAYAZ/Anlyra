import { AppShell } from '@/components/layout/AppShell';
import { DashboardView } from './DashboardView';

export const dynamic = 'force-dynamic';

export default async function DashboardViewPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return (
    <AppShell>
      <DashboardView id={params.id} />
    </AppShell>
  );
}
