"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type IntegrationStatus = "CONNECTED" | "ERROR" | "DISCONNECTED";
type Plan = "FREEMIUM" | "STARTER" | "PRO" | "ENTERPRISE";
import { planMeets } from "@/lib/plan/feature-gate";
import type { IntegrationDefinition } from "@/lib/integrations/registry";

interface Props {
  definition: IntegrationDefinition;
  status: IntegrationStatus | "DISCONNECTED";
  plan: Plan;
}

const STATUS_TONE: Record<IntegrationStatus, "success" | "danger" | "default"> = {
  CONNECTED: "success",
  ERROR: "danger",
  DISCONNECTED: "default",
};

export function IntegrationCard({ definition, status, plan }: Props) {
  const t = useTranslations("integrations");
  const tProvider = useTranslations("integrations.providers");
  const allowed = planMeets(plan, definition.requiredPlan);
  const isConnected = status === "CONNECTED";

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 font-heading text-sm font-bold text-primary">
            {definition.name.slice(0, 2).toUpperCase()}
          </div>
          <CardTitle>{definition.name}</CardTitle>
        </div>
        <Badge variant={STATUS_TONE[status]}>{t(`status.${status}`)}</Badge>
      </CardHeader>
      <p className="mb-4 flex-1 text-sm text-slate-600">
        {tProvider(definition.descriptionKey)}
      </p>
      <div className="flex items-center justify-between">
        <Badge variant="info">{t(`categories.${definition.category}`)}</Badge>
        {allowed ? (
          <Link href={`/integrations/${definition.id}`}>
            <Button variant={isConnected ? "secondary" : "primary"} size="sm">
              {isConnected ? t("actions.manage") : t("actions.connect")}
            </Button>
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            <Badge variant="warning">
              {t("lockedOn", { plan: definition.requiredPlan })}
            </Badge>
            <Link href="/billing">
              <Button variant="ghost" size="sm">
                {t("upgrade")}
              </Button>
            </Link>
          </div>
        )}
      </div>
    </Card>
  );
}
