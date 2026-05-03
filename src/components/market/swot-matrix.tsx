"use client";

import { useTranslations } from "next-intl";
import { Lightbulb, Shield, ShieldAlert, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SwotItem, SwotKind } from "@/types/market";

const QUADRANTS: Array<{
  kind: SwotKind;
  labelKey: "strengths" | "weaknesses" | "opportunities" | "threats";
  icon: typeof Shield;
  classes: string;
}> = [
  {
    kind: "STRENGTH",
    labelKey: "strengths",
    icon: Shield,
    classes: "bg-success/10 border-success/30 text-success",
  },
  {
    kind: "WEAKNESS",
    labelKey: "weaknesses",
    icon: ShieldAlert,
    classes: "bg-danger/10 border-danger/30 text-danger",
  },
  {
    kind: "OPPORTUNITY",
    labelKey: "opportunities",
    icon: Lightbulb,
    classes: "bg-primary-accent/10 border-primary-accent/30 text-primary",
  },
  {
    kind: "THREAT",
    labelKey: "threats",
    icon: TrendingUp,
    classes: "bg-warning/10 border-warning/30 text-warning",
  },
];

export function SwotMatrix({ items }: { items: SwotItem[] }) {
  const t = useTranslations("market.positioning");

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {QUADRANTS.map((q) => {
        const list = items.filter((i) => i.kind === q.kind);
        const Icon = q.icon;
        return (
          <div
            key={q.kind}
            className={cn(
              "rounded-xl border p-5 shadow-card",
              q.classes,
            )}
          >
            <div className="mb-3 flex items-center gap-2">
              <Icon className="h-4 w-4" />
              <h3 className="font-heading text-sm font-semibold uppercase tracking-wider">
                {t(q.labelKey)}
              </h3>
            </div>
            <ul className="space-y-2">
              {list.map((item) => (
                <li
                  key={item.id}
                  className="rounded-md bg-card/80 px-3 py-2 text-sm text-foreground"
                >
                  {item.text}
                </li>
              ))}
              {list.length === 0 ? (
                <li className="text-xs italic text-foreground/60">—</li>
              ) : null}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
