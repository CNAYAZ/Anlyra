"use client";

import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
  Legend,
  Cell,
} from "recharts";
import { useTranslations } from "next-intl";
import type { Competitor, MarketProfile } from "@/types/market";
import { formatPercent } from "@/lib/format";
import { useLocale } from "@/hooks/use-locale";

type Point = {
  name: string;
  price: number;
  quality: number;
  share: number;
  isYou: boolean;
};

export function PositioningScatter({
  profile,
  competitors,
}: {
  profile: MarketProfile;
  competitors: Competitor[];
}) {
  const t = useTranslations("market.positioning");
  const locale = useLocale();

  const youPoint: Point[] = [
    {
      name: t("you"),
      price: profile.pricePosition,
      quality: profile.qualityScore,
      share: profile.marketSharePct,
      isYou: true,
    },
  ];
  const competitorPoints: Point[] = competitors.map((c) => ({
    name: c.name,
    price: c.pricePosition,
    quality: c.qualityScore,
    share: c.marketSharePct,
    isYou: false,
  }));

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 16, right: 24, bottom: 32, left: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            type="number"
            dataKey="price"
            name={t("price")}
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "#475569" }}
            label={{
              value: t("price"),
              position: "insideBottom",
              offset: -16,
              style: { fontSize: 12, fill: "#64748b" },
            }}
          />
          <YAxis
            type="number"
            dataKey="quality"
            name={t("quality")}
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "#475569" }}
            label={{
              value: t("quality"),
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 12, fill: "#64748b" },
            }}
          />
          <ZAxis type="number" dataKey="share" range={[120, 1400]} name="Share" />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 12,
            }}
            formatter={(value: number, key: string) => {
              if (key === "share") return [`${formatPercent(value, locale)}%`, "share"];
              return [value, key];
            }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as Point;
              return (
                <div className="rounded-md border border-border bg-card p-2 text-xs shadow-card">
                  <div className="mb-1 font-medium">{p.name}</div>
                  <div>{t("price")}: {p.price.toFixed(0)}</div>
                  <div>{t("quality")}: {p.quality.toFixed(0)}</div>
                  <div>Share: {formatPercent(p.share, locale)}%</div>
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} iconSize={10} />
          <Scatter name={t("you")} data={youPoint} fill="#2563eb">
            {youPoint.map((_, i) => (
              <Cell key={i} fill="#2563eb" />
            ))}
          </Scatter>
          <Scatter name="Competitors" data={competitorPoints} fill="#94a3b8">
            {competitorPoints.map((_, i) => (
              <Cell key={i} fill="#94a3b8" />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
