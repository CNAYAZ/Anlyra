"use client";

import { useMemo } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { useTranslations } from "next-intl";
import type { Competitor, MarketProfile } from "@/types/market";

const DIMENSIONS = [
  { key: "Revenue", label: "revenue" },
  { key: "Team", label: "team" },
  { key: "Share", label: "share" },
  { key: "Pricing", label: "pricing" },
  { key: "Product", label: "product" },
  { key: "Brand", label: "brand" },
] as const;

export function CompetitorRadarChart({
  profile,
  competitors,
}: {
  profile: MarketProfile;
  competitors: Competitor[];
}) {
  const t = useTranslations("market.competitors");

  const data = useMemo(() => {
    return DIMENSIONS.map((d) => {
      const youKey =
        `score${d.key}` as `score${"Revenue" | "Team" | "Share" | "Pricing" | "Product" | "Brand"}`;
      const row: Record<string, number | string> = {
        dimension: d.key,
        you: profile[youKey],
      };
      for (const c of competitors) {
        row[c.name] = c[youKey];
      }
      return row;
    });
  }, [profile, competitors]);

  // muted greys for competitors so the user's brand blue stands out
  const greys = ["#94a3b8", "#cbd5e1", "#9ca3af", "#6b7280", "#a1a1aa"];

  return (
    <div className="h-[360px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="75%">
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fontSize: 12, fill: "#475569" }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
          />
          <Radar
            name={t("you")}
            dataKey="you"
            stroke="#2563eb"
            fill="#3b82f6"
            fillOpacity={0.4}
            strokeWidth={2}
          />
          {competitors.map((c, i) => (
            <Radar
              key={c.id}
              name={c.name}
              dataKey={c.name}
              stroke={greys[i % greys.length]}
              fill={greys[i % greys.length]}
              fillOpacity={0.08}
              strokeWidth={1.5}
            />
          ))}
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            iconSize={10}
            verticalAlign="bottom"
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 12,
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
