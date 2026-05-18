"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PriceToggle, type Cycle } from "@/components/billing/PriceToggle";
import { PricingCard } from "@/components/billing/PricingCard";
import { PlanCompareTable } from "@/components/billing/PlanCompareTable";
import { FaqAccordion } from "@/components/billing/FaqAccordion";

export function PricingClient({ isAuthenticated }: { isAuthenticated: boolean }) {
  const t = useTranslations("pricing");
  const [cycle, setCycle] = useState<Cycle>("monthly");

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-10 p-6 py-10">
      <header className="flex flex-col items-center gap-4 text-center">
        <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-muted-foreground">{t("subtitle")}</p>
        <PriceToggle value={cycle} onChange={setCycle} />
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <PricingCard planId="STARTER" cycle={cycle} showUpgradeButton={isAuthenticated} />
        <PricingCard planId="PRO" cycle={cycle} showUpgradeButton={isAuthenticated} />
        <PricingCard planId="ENTERPRISE" cycle={cycle} showUpgradeButton={isAuthenticated} />
      </section>

      <section>
        <h2 className="mb-4 font-heading text-2xl font-semibold text-foreground">
          {t("compareTitle")}
        </h2>
        <div className="rounded-card border border-border bg-card p-4">
          <PlanCompareTable cycle={cycle} currentPlan={null} />
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-heading text-2xl font-semibold text-foreground">
          {t("faqTitle")}
        </h2>
        <FaqAccordion />
      </section>
    </main>
  );
}
