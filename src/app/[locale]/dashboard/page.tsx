import { setRequestLocale } from 'next-intl/server';
import { AppShell } from '@/components/app-shell';
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default async function DashboardPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <AppShell>
      <div>
        <h1 className="font-heading text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          The dashboard module ships in the dashboard block. This is a placeholder.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {['MRR', 'Customers', 'Churn'].map((k) => (
            <Card key={k}>
              <CardHeader>
                <CardDescription>{k}</CardDescription>
                <CardTitle className="font-mono text-3xl">—</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-400">No data yet</CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
