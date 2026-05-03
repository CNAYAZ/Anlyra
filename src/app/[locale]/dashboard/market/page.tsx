import { FeatureGate } from "@/components/billing/FeatureGate";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";

export default function MarketPage() {
  return (
    <div className="mx-auto max-w-6xl p-6">
      <FeatureGate feature="market">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Market Analytics</CardTitle>
              <CardDescription>TAM, SAM, SOM, competitor overview, trends.</CardDescription>
            </div>
          </CardHeader>
          <p className="text-sm text-slate-600">Block 5 dashboards render here.</p>
        </Card>
      </FeatureGate>
    </div>
  );
}
