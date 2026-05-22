"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { PlanId } from "@/lib/billing/plans";
import { Button } from "@/components/ui/button";
import type { Cycle } from "./PriceToggle";

export function UpgradeButton({
  plan,
  cycle,
  variant = "primary",
  size = "md",
  label,
  className,
}: {
  plan: PlanId;
  cycle: Cycle;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}) {
  const t = useTranslations("common");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, cycle }),
      });
      const json = (await res.json()) as { success: boolean; data?: { url: string }; error?: string };
      if (json.success && json.data?.url) {
        window.location.href = json.data.url;
      } else {
        setError(json.error ?? "Checkout failed");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <Button onClick={go} disabled={busy} variant={variant} size={size}>
        {busy ? "…" : (label ?? t("upgrade"))}
      </Button>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
