"use client";

import { useTranslations, useLocale } from "next-intl";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { buildUsageMetrics, type UsageSnapshot } from "@/lib/billing/usage";
import { usePlan } from "@/lib/billing/context";
import { formatNumber } from "@/lib/utils";

export function UsageMeter({ snapshot }: { snapshot: UsageSnapshot }) {
  const t = useTranslations("billing.usage");
  const locale = (useLocale() as "it" | "en") ?? "it";
  const { plan } = usePlan();
  const metrics = buildUsageMetrics(plan, snapshot);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <div className="space-y-4">
        {metrics.map((m) => {
          const variant = m.percent >= 90 ? "danger" : m.percent >= 70 ? "warning" : "primary";
          return (
            <div key={m.key}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-slate-700">{t(m.key)}</span>
                <span className="num text-slate-600">
                  {m.unlimited
                    ? t("usedUnlimited", { used: formatNumber(m.used, locale) })
                    : t("usedOf", {
                        used: formatNumber(m.used, locale),
                        limit: formatNumber(Math.max(m.limit, 0), locale),
                      })}
                </span>
              </div>
              <Progress value={m.unlimited ? 0 : m.percent} variant={variant} />
            </div>
          );
        })}
      </div>
    </Card>
  );
}
