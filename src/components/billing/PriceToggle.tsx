"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type Cycle = "monthly" | "yearly";

export function PriceToggle({
  value,
  onChange,
}: {
  value: Cycle;
  onChange: (next: Cycle) => void;
}) {
  const t = useTranslations("common");
  const tBilling = useTranslations("billing.compare");
  return (
    <div className="inline-flex items-center rounded-full border border-border bg-card p-1 text-sm">
      <button
        type="button"
        onClick={() => onChange("monthly")}
        className={cn(
          "rounded-full px-4 py-1.5 font-medium transition-colors",
          value === "monthly" ? "bg-primary-accent text-white" : "text-muted-foreground",
        )}
        aria-pressed={value === "monthly"}
      >
        {t("monthly")}
      </button>
      <button
        type="button"
        onClick={() => onChange("yearly")}
        className={cn(
          "flex items-center gap-2 rounded-full px-4 py-1.5 font-medium transition-colors",
          value === "yearly" ? "bg-primary-accent text-white" : "text-muted-foreground",
        )}
        aria-pressed={value === "yearly"}
      >
        <span>{t("yearly")}</span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-semibold",
            value === "yearly" ? "bg-white/20 text-white" : "bg-success/10 text-success",
          )}
          aria-hidden
        >
          -20%
        </span>
        <span className="sr-only">{tBilling("yearlyToggle")}</span>
      </button>
    </div>
  );
}
