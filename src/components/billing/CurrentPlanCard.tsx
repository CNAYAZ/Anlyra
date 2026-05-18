"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState } from "react";
import { CalendarClock, ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePlan } from "@/lib/billing/context";
import { PLANS } from "@/lib/billing/plans";
import { formatDate } from "@/lib/utils";

export function CurrentPlanCard() {
  const t = useTranslations("billing.currentPlanCard");
  const tPlans = useTranslations();
  const locale = (useLocale() as "it" | "en") ?? "it";
  const { plan, status, periodEnd, cancelAtPeriodEnd } = usePlan();
  const [busy, setBusy] = useState(false);

  const planName = tPlans(PLANS[plan].nameKey as "billing.plans.pro.name");

  const statusBadge =
    status === "active"
      ? { label: t("active"), variant: "success" as const }
      : status === "trialing"
        ? { label: t("trialing"), variant: "info" as const }
        : status === "past_due"
          ? { label: t("pastDue"), variant: "warning" as const }
          : { label: t("canceled"), variant: "danger" as const };

  async function openPortal() {
    setBusy(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const json = (await res.json()) as { success: boolean; data?: { url: string }; error?: string };
      if (json.success && json.data?.url) window.location.href = json.data.url;
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>
            <span className="font-heading text-2xl font-semibold text-foreground">{planName}</span>
          </CardDescription>
        </div>
        <Badge variant={statusBadge.variant}>
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> {statusBadge.label}
        </Badge>
      </CardHeader>

      {periodEnd && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarClock className="h-4 w-4" aria-hidden />
          {cancelAtPeriodEnd
            ? t("endsOn", { date: formatDate(periodEnd, locale) })
            : t("renewsOn", { date: formatDate(periodEnd, locale) })}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={openPortal} disabled={busy || plan === "FREE"} variant="secondary">
          {t("manageBtn")}
        </Button>
        {plan !== "ENTERPRISE" && (
          <a href="#compare" className="contents">
            <Button>{t("upgradeBtn")}</Button>
          </a>
        )}
      </div>
    </Card>
  );
}
