"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

type SyncFrequency = "H6" | "H12" | "H24";

interface Props {
  providerId: string;
  status: "CONNECTED" | "ERROR";
  frequency: SyncFrequency;
  lastSyncAt: string | null;
}

const FREQUENCIES: SyncFrequency[] = ["H6", "H12", "H24"];

export function IntegrationManager({
  providerId,
  status,
  frequency,
  lastSyncAt,
}: Props) {
  const t = useTranslations("integrations");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [currentFreq, setCurrentFreq] = useState<SyncFrequency>(frequency);
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  async function call(
    path: string,
    init?: RequestInit,
  ): Promise<{ success: boolean; error?: string }> {
    const res = await fetch(`/api/integrations/${providerId}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      ...init,
    });
    return res.json();
  }

  function syncNow() {
    setActionError(null);
    startTransition(async () => {
      const json = await call("sync");
      if (!json.success) setActionError(json.error ?? tCommon("error"));
      router.refresh();
    });
  }

  function disconnect() {
    setActionError(null);
    startTransition(async () => {
      const json = await call("disconnect");
      if (!json.success) setActionError(json.error ?? tCommon("error"));
      router.refresh();
    });
  }

  function changeFrequency(next: SyncFrequency) {
    const previous = currentFreq;
    setCurrentFreq(next);
    setActionError(null);
    startTransition(async () => {
      const json = await call("frequency", {
        body: JSON.stringify({ frequency: next }),
      });
      if (!json.success) {
        setCurrentFreq(previous);
        setActionError(json.error ?? tCommon("error"));
      } else {
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{providerId}</CardTitle>
        <Badge variant={status === "CONNECTED" ? "success" : "danger"}>
          {t(`status.${status}`)}
        </Badge>
      </CardHeader>
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("lastSync")}</span>
          <span className="font-mono text-foreground">
            {lastSyncAt
              ? formatDate(new Date(lastSyncAt), locale)
              : t("neverSynced")}
          </span>
        </div>
        <div>
          <label
            htmlFor="freq"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            {t("frequency.label")}
          </label>
          <select
            id="freq"
            value={currentFreq}
            onChange={(e) => changeFrequency(e.target.value as SyncFrequency)}
            disabled={pending}
            className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary-accent focus:outline-none focus:ring-1 focus:ring-primary-accent"
          >
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {t(`frequency.${f}`)}
              </option>
            ))}
          </select>
        </div>
        {actionError && <p className="text-sm text-danger">{actionError}</p>}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button onClick={syncNow} disabled={pending}>
            {t("actions.syncNow")}
          </Button>
          <Button
            onClick={disconnect}
            disabled={pending}
            variant="danger"
          >
            {t("actions.disconnect")}
          </Button>
        </div>
      </div>
    </Card>
  );
}
