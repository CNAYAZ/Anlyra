import { FeatureGate } from "@/components/billing/FeatureGate";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";

export default function OperationsPage() {
  return (
    <div className="mx-auto max-w-6xl p-6">
      <FeatureGate feature="operations">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Operations & KPIs</CardTitle>
              <CardDescription>Throughput, utilization, SLAs, cost-to-serve.</CardDescription>
            </div>
          </CardHeader>
          <p className="text-sm text-slate-600">Block 6 dashboards render here.</p>
        </Card>
      </FeatureGate>
    </div>
  );
}
