"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CREDIT_PACKS } from "@/lib/billing/plans";
import { convertFromEuroCents, detectCurrencyFromLocale } from "@/lib/billing/currency";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { EmptyState } from "@/components/states/States";

export interface CreditEntry {
  id: string;
  delta: number;
  reason: "monthly_grant" | "purchase" | "ai_call" | "refund";
  createdAt: string;
}

export function CreditsCard({
  balance,
  history,
}: {
  balance: number;
  history: CreditEntry[];
}) {
  const t = useTranslations("billing.credits");
  const locale = (useLocale() as "it" | "en") ?? "it";
  const currency = detectCurrencyFromLocale(locale === "it" ? "it-IT" : "en-US");
  const [busy, setBusy] = useState<string | null>(null);

  async function buy(packId: string) {
    setBusy(packId);
    try {
      const res = await fetch("/api/billing/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const json = (await res.json()) as { success: boolean; data?: { url: string }; error?: string };
      if (json.success && json.data?.url) window.location.href = json.data.url;
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("noExpiry")}</CardDescription>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1.5 text-accent">
          <Sparkles className="h-4 w-4" aria-hidden />
          <span className="num text-base font-semibold">{formatNumber(balance, locale)}</span>
          <span className="text-xs">
            {balance === 1 ? t("credit") : t("credits")}
          </span>
        </div>
      </CardHeader>

      <div className="grid gap-3 sm:grid-cols-3">
        {CREDIT_PACKS.map((pack) => {
          const display = convertFromEuroCents(pack.priceCents, currency);
          return (
            <div
              key={pack.id}
              className="flex flex-col items-start gap-2 rounded-card border border-border p-4"
            >
              <div className="text-sm text-muted-foreground">+{formatNumber(pack.credits, locale)} {t("credits")}</div>
              <div className="num text-xl font-semibold text-foreground">
                {formatCurrency(display, currency, locale)}
              </div>
              <Button
                size="sm"
                disabled={busy !== null}
                onClick={() => buy(pack.id)}
                className="mt-1"
              >
                {busy === pack.id ? "…" : t("buyPack")}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="mt-6">
        <h4 className="mb-2 font-heading text-sm font-semibold text-foreground">{t("history")}</h4>
        {history.length === 0 ? (
          <EmptyState message={t("history")} />
        ) : (
          <ul className="divide-y divide-border/50 rounded-card border border-border">
            {history.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-4 px-4 py-2 text-sm"
              >
                <span className="text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleDateString(locale === "it" ? "it-IT" : "en-US")}
                </span>
                <span className="text-muted-foreground">{entry.reason}</span>
                <span
                  className={
                    "num font-semibold " + (entry.delta >= 0 ? "text-success" : "text-danger")
                  }
                >
                  {entry.delta > 0 ? "+" : ""}
                  {formatNumber(entry.delta, locale)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
