"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { PLANS, type PlanId } from "@/lib/billing/plans";
import { LinkButton } from "@/components/ui/LinkButton";

export interface UpgradePromptProps {
  requiredPlan: PlanId | null;
  title?: string;
  description?: string;
  compact?: boolean;
}

export function UpgradePrompt({ requiredPlan, title, description, compact }: UpgradePromptProps) {
  const t = useTranslations("billing.gate");
  const tRoot = useTranslations();

  const planName = requiredPlan
    ? tRoot(PLANS[requiredPlan].nameKey as "billing.plans.pro.name")
    : "Pro";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={
        "relative flex flex-col items-center justify-center gap-4 rounded-card border border-dashed border-border bg-muted/50 text-center " +
        (compact ? "p-6" : "p-10")
      }
      role="region"
      aria-label="upgrade-required"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-accent/10 text-primary-accent">
        <Lock className="h-6 w-6" aria-hidden />
      </div>
      <div className="max-w-md">
        <h3 className="font-heading text-lg font-semibold text-foreground">
          {title ?? t("lockedTitle")}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {description ?? t("lockedDescription", { plan: planName })}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <LinkButton href="/settings/billing" variant="primary">
          {t("upgradeNow")}
        </LinkButton>
        <LinkButton href="/pricing" variant="outline">
          {t("viewPlans")}
        </LinkButton>
      </div>
    </motion.div>
  );
}
