"use client";

import { useTranslations, useLocale } from "next-intl";
import { Check, X } from "lucide-react";
import {
  ALL_FEATURES,
  PLANS,
  type FeatureKey,
  type PlanId,
  isUnlimited,
} from "@/lib/billing/plans";
import { convertFromEuroCents, detectCurrencyFromLocale, type Currency } from "@/lib/billing/currency";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Cycle } from "./PriceToggle";

function PriceCell({
  plan,
  cycle,
  currency,
  locale,
}: {
  plan: PlanId;
  cycle: Cycle;
  currency: Currency;
  locale: "it" | "en";
}) {
  const t = useTranslations("common");
  const cents =
    cycle === "monthly" ? PLANS[plan].pricing.monthlyCents : PLANS[plan].pricing.yearlyCents;
  if (cents === 0) return <span className="text-muted-foreground">—</span>;
  const display = convertFromEuroCents(cents, currency);
  return (
    <div className="flex items-baseline gap-1">
      <span className="num text-2xl font-semibold text-foreground">
        {formatCurrency(display, currency, locale)}
      </span>
      <span className="text-xs text-muted-foreground">
        {cycle === "monthly" ? t("perMonth") : t("perYear")}
      </span>
    </div>
  );
}

function LimitText({ value, kind }: { value: number; kind: "users" | "orgs" | "imports" | "aiCredits" | "customDashboards" }) {
  const t = useTranslations("billing.limits");
  if (isUnlimited(value)) return <span>{t("unlimited")}</span>;
  if (kind === "aiCredits") return <span>{t("aiCredits", { count: value })}</span>;
  return <span>{t(kind, { count: value })}</span>;
}

export function PlanCompareTable({ cycle, currentPlan }: { cycle: Cycle; currentPlan: PlanId | null }) {
  const t = useTranslations("billing.compare");
  const tFeat = useTranslations("billing.features");
  const tCommon = useTranslations("common");
  const tPlans = useTranslations();
  const locale = (useLocale() as "it" | "en") ?? "it";
  const currency = detectCurrencyFromLocale(locale === "it" ? "it-IT" : "en-US");

  const visiblePlans: PlanId[] = ["STARTER", "PRO", "ENTERPRISE"];

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 w-1/3 bg-card p-4 text-left font-heading text-sm font-semibold text-muted-foreground">
              {t("feature")}
            </th>
            {visiblePlans.map((p) => {
              const plan = PLANS[p];
              const name = tPlans(plan.nameKey as "billing.plans.pro.name");
              const isHighlighted = plan.highlight;
              const isCurrent = currentPlan === p;
              return (
                <th
                  key={p}
                  className={cn(
                    "p-4 text-left align-top",
                    isHighlighted && "bg-primary-accent/5",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-heading text-base font-semibold text-foreground">
                      {name}
                    </span>
                    {isHighlighted && <Badge variant="info">{tCommon("mostPopular")}</Badge>}
                    {isCurrent && <Badge variant="success">{tCommon("currentPlan")}</Badge>}
                  </div>
                  <div className="mt-2">
                    <PriceCell plan={p} cycle={cycle} currency={currency} locale={locale} />
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {(["users", "orgs", "imports", "aiCredits", "customDashboards"] as const).map((k) => (
            <tr key={k} className="border-t border-border/50">
              <td className="sticky left-0 bg-card p-3 text-sm text-foreground">
                <LimitLabel kind={k} />
              </td>
              {visiblePlans.map((p) => (
                <td key={p} className="p-3 text-sm text-foreground">
                  <LimitText value={PLANS[p].limits[k]} kind={k} />
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <td
              colSpan={visiblePlans.length + 1}
              className="pt-6 pb-2 text-xs uppercase tracking-wide text-muted-foreground"
            >
              Features
            </td>
          </tr>
          {ALL_FEATURES.map((f: FeatureKey) => (
            <tr key={f} className="border-t border-border/50">
              <td className="sticky left-0 bg-card p-3 text-sm text-foreground">{tFeat(f)}</td>
              {visiblePlans.map((p) => {
                const has = PLANS[p].features.includes(f);
                return (
                  <td key={p} className="p-3">
                    {has ? (
                      <Check className="h-4 w-4 text-success" aria-label="included" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground/50" aria-label="not included" />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LimitLabel({ kind }: { kind: "users" | "orgs" | "imports" | "aiCredits" | "customDashboards" }) {
  const t = useTranslations("billing.usage");
  return <span>{t(kind)}</span>;
}
