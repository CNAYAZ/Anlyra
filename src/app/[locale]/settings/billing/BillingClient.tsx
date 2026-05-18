"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { PlanId } from "@/lib/billing/plans";
import { PLAN_ORDER, PLANS } from "@/lib/billing/plans";
import { CurrentPlanCard } from "@/components/billing/CurrentPlanCard";
import { UsageMeter } from "@/components/billing/UsageMeter";
import { CreditsCard, type CreditEntry } from "@/components/billing/CreditsCard";
import { InvoicesList, type InvoiceRow } from "@/components/billing/InvoicesList";
import { PlanCompareTable } from "@/components/billing/PlanCompareTable";
import { PriceToggle, type Cycle } from "@/components/billing/PriceToggle";
import { UpgradeButton } from "@/components/billing/UpgradeButton";
import type { UsageSnapshot } from "@/lib/billing/usage";

export function BillingClient({
  usage,
  invoices,
  creditBalance,
  creditHistory,
  currentPlan,
}: {
  usage: UsageSnapshot;
  invoices: InvoiceRow[];
  creditBalance: number;
  creditHistory: CreditEntry[];
  currentPlan: PlanId;
}) {
  const t = useTranslations("billing");
  const tCompare = useTranslations("billing.compare");
  const [cycle, setCycle] = useState<Cycle>("monthly");

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <header>
        <h1 className="font-heading text-3xl font-semibold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <CurrentPlanCard />
        <UsageMeter snapshot={usage} />
      </div>

      <CreditsCard balance={creditBalance} history={creditHistory} />

      <section id="compare" className="space-y-4 scroll-mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-xl font-semibold text-foreground">
            {tCompare("title")}
          </h2>
          <PriceToggle value={cycle} onChange={setCycle} />
        </div>

        <div className="rounded-card border bg-card p-4">
          <PlanCompareTable cycle={cycle} currentPlan={currentPlan} />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {(["STARTER", "PRO", "ENTERPRISE"] as const).map((p) => {
            const isCurrent = p === currentPlan;
            const isLower = PLAN_ORDER.indexOf(p) <= PLAN_ORDER.indexOf(currentPlan);
            return (
              <UpgradeButton
                key={p}
                plan={p}
                cycle={cycle}
                variant={PLANS[p].highlight ? "primary" : "secondary"}
                label={
                  isCurrent ? t("currentPlanCard.title") : isLower ? "Downgrade" : "Upgrade"
                }
              />
            );
          })}
        </div>
      </section>

      <InvoicesList invoices={invoices} />
    </div>
  );
}
