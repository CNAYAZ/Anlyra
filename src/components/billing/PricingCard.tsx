"use client";

import { useTranslations, useLocale } from "next-intl";
import { Check } from "lucide-react";
import {
  PLANS,
  type PlanId,
  isUnlimited,
  yearlySavingsPct,
  PLAN_ORDER,
} from "@/lib/billing/plans";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/LinkButton";
import {
  convertFromEuroCents,
  detectCurrencyFromLocale,
} from "@/lib/billing/currency";
import { formatCurrency, cn } from "@/lib/utils";
import { UpgradeButton } from "./UpgradeButton";
import type { Cycle } from "./PriceToggle";

export function PricingCard({
  planId,
  cycle,
  showUpgradeButton,
}: {
  planId: PlanId;
  cycle: Cycle;
  showUpgradeButton: boolean;
}) {
  const t = useTranslations("pricing");
  const tCommon = useTranslations("common");
  const tFeat = useTranslations("billing.features");
  const tLimits = useTranslations("billing.limits");
  const tPlans = useTranslations();
  const locale = (useLocale() as "it" | "en") ?? "it";
  const currency = detectCurrencyFromLocale(locale === "it" ? "it-IT" : "en-US");

  const plan = PLANS[planId];
  const cents = cycle === "monthly" ? plan.pricing.monthlyCents : plan.pricing.yearlyCents;
  const savings = cycle === "yearly" ? yearlySavingsPct(plan) : 0;

  const limits = plan.limits;
  const previousPlan: PlanId | null =
    PLAN_ORDER.indexOf(planId) > 0 ? PLAN_ORDER[PLAN_ORDER.indexOf(planId) - 1] : null;
  const previousFeatures = previousPlan ? PLANS[previousPlan].features : [];
  const newFeatures = plan.features.filter((f) => !previousFeatures.includes(f));

  return (
    <Card
      className={cn(
        "flex flex-col gap-4",
        plan.highlight && "ring-2 ring-primary-accent",
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-xl font-semibold text-slate-900">
          {tPlans(plan.nameKey as "billing.plans.pro.name")}
        </h3>
        {plan.highlight && <Badge variant="primary">{tCommon("mostPopular")}</Badge>}
      </div>

      <p className="text-sm text-slate-600">
        {tPlans(plan.taglineKey as "billing.plans.pro.tagline")}
      </p>

      <div className="flex items-baseline gap-1">
        {cents === 0 ? (
          <span className="num text-4xl font-semibold text-slate-900">
            {formatCurrency(0, currency, locale)}
          </span>
        ) : (
          <>
            <span className="num text-4xl font-semibold text-slate-900">
              {formatCurrency(convertFromEuroCents(cents, currency), currency, locale)}
            </span>
            <span className="text-sm text-slate-500">
              {cycle === "monthly" ? tCommon("perMonth") : tCommon("perYear")}
            </span>
          </>
        )}
      </div>

      {savings > 0 && (
        <Badge variant="success">
          {tCommon("save2Months")} (-{savings}%)
        </Badge>
      )}

      <ul className="space-y-2 text-sm text-slate-700">
        <li className="flex items-start gap-2">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
          {isUnlimited(limits.users)
            ? tLimits("unlimited")
            : tLimits("users", { count: limits.users })}
        </li>
        <li className="flex items-start gap-2">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
          {isUnlimited(limits.imports)
            ? tLimits("unlimited")
            : tLimits("imports", { count: limits.imports })}
        </li>
        <li className="flex items-start gap-2">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
          {tLimits("aiCredits", { count: limits.aiCredits })}
        </li>
        {limits.customDashboards !== 0 && (
          <li className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
            {isUnlimited(limits.customDashboards)
              ? tLimits("unlimited")
              : tLimits("customDashboards", { count: limits.customDashboards })}
          </li>
        )}
      </ul>

      {newFeatures.length > 0 && (
        <div className="space-y-2 border-t border-slate-100 pt-4 text-sm">
          {previousPlan && (
            <p className="text-xs uppercase tracking-wide text-slate-400">
              {t("everythingIn", {
                plan: tPlans(PLANS[previousPlan].nameKey as "billing.plans.pro.name"),
              })}
            </p>
          )}
          <ul className="space-y-2">
            {newFeatures.slice(0, 6).map((f) => (
              <li key={f} className="flex items-start gap-2 text-slate-700">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary-accent" aria-hidden />
                {tFeat(f)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-auto pt-4">
        {planId === "FREE" ? (
          <LinkButton href="/signup" variant="outline" className="w-full justify-center">
            {t("ctaFree")}
          </LinkButton>
        ) : showUpgradeButton ? (
          <UpgradeButton
            plan={planId as Exclude<PlanId, "FREE">}
            cycle={cycle}
            variant={plan.highlight ? "primary" : "outline"}
            label={t("ctaUpgrade")}
            className="w-full"
          />
        ) : (
          <LinkButton
            href="/signup"
            variant={plan.highlight ? "primary" : "outline"}
            className="w-full justify-center"
          >
            {t("ctaUpgrade")}
          </LinkButton>
        )}
      </div>
    </Card>
  );
}
