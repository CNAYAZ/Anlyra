"use client";

import { useTranslations } from "next-intl";
import type { Competitor, MarketProfile } from "@/types/market";
import {
  formatCompactCurrency,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import { useAppLocale } from "@/hooks/use-locale";
import { cn } from "@/lib/utils";

type Row = {
  key: string;
  label: string;
  format: (value: number) => string;
  values: Record<string, number>;
  /** higher is better → green, lower → red */
  higherIsBetter?: boolean;
};

export function ComparisonTable({
  profile,
  competitors,
  marketSharePct,
  revenueAnchor,
  employeesAnchor,
}: {
  profile: MarketProfile;
  competitors: Competitor[];
  marketSharePct: number;
  revenueAnchor: number;
  employeesAnchor: number;
}) {
  const t = useTranslations("market.positioning");
  const locale = useAppLocale();

  const fmtPct = (v: number) => `${formatPercent(v, locale)}%`;
  const fmtCur = (v: number) => formatCompactCurrency(v, locale);
  const fmtNum = (v: number) => formatNumber(v, locale);
  const fmtScore = (v: number) => v.toFixed(0);

  const rows: Row[] = [
    {
      key: "share",
      label: t("rows.share"),
      format: fmtPct,
      values: {
        you: marketSharePct,
        ...Object.fromEntries(competitors.map((c) => [c.id, c.marketSharePct])),
      },
      higherIsBetter: true,
    },
    {
      key: "revenue",
      label: t("rows.revenue"),
      format: fmtCur,
      values: {
        you: revenueAnchor,
        ...Object.fromEntries(competitors.map((c) => [c.id, c.revenue])),
      },
      higherIsBetter: true,
    },
    {
      key: "employees",
      label: t("rows.employees"),
      format: fmtNum,
      values: {
        you: employeesAnchor,
        ...Object.fromEntries(competitors.map((c) => [c.id, c.employees])),
      },
      higherIsBetter: true,
    },
    {
      key: "price",
      label: t("rows.price"),
      format: fmtScore,
      values: {
        you: profile.pricePosition,
        ...Object.fromEntries(competitors.map((c) => [c.id, c.pricePosition])),
      },
    },
    {
      key: "quality",
      label: t("rows.quality"),
      format: fmtScore,
      values: {
        you: profile.qualityScore,
        ...Object.fromEntries(competitors.map((c) => [c.id, c.qualityScore])),
      },
      higherIsBetter: true,
    },
    {
      key: "product",
      label: t("rows.product"),
      format: fmtScore,
      values: {
        you: profile.scoreProduct,
        ...Object.fromEntries(competitors.map((c) => [c.id, c.scoreProduct])),
      },
      higherIsBetter: true,
    },
    {
      key: "brand",
      label: t("rows.brand"),
      format: fmtScore,
      values: {
        you: profile.scoreBrand,
        ...Object.fromEntries(competitors.map((c) => [c.id, c.scoreBrand])),
      },
      higherIsBetter: true,
    },
  ];

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left font-medium">{t("metric")}</th>
            <th className="px-4 py-3 text-right font-medium text-primary">
              {t("you")}
            </th>
            {competitors.map((c) => (
              <th
                key={c.id}
                className="px-4 py-3 text-right font-medium"
                title={c.name}
              >
                {c.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const youValue = row.values.you;
            const allValues = Object.values(row.values);
            const max = Math.max(...allValues);
            const min = Math.min(...allValues);
            return (
              <tr
                key={row.key}
                className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}
              >
                <td className="px-4 py-3 font-medium">{row.label}</td>
                <td
                  className={cn(
                    "px-4 py-3 text-right font-mono tabular-nums",
                    row.higherIsBetter
                      ? youValue === max
                        ? "text-success"
                        : youValue === min
                          ? "text-danger"
                          : "text-foreground"
                      : "text-foreground",
                    "font-semibold",
                  )}
                >
                  {row.format(youValue)}
                </td>
                {competitors.map((c) => {
                  const v = row.values[c.id] ?? 0;
                  const isMax = v === max;
                  const isMin = v === min;
                  return (
                    <td
                      key={c.id}
                      className={cn(
                        "px-4 py-3 text-right font-mono tabular-nums",
                        row.higherIsBetter
                          ? isMax
                            ? "text-success"
                            : isMin
                              ? "text-danger"
                              : "text-foreground/80"
                          : "text-foreground/80",
                      )}
                    >
                      {row.format(v)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
