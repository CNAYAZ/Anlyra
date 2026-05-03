"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslations } from "next-intl";
import type { Competitor, MarketProfile } from "@/types/market";
import { formatPercent } from "@/lib/format";
import { useLocale } from "@/hooks/use-locale";

export function ShareBarChart({
  profile,
  competitors,
}: {
  profile: MarketProfile;
  competitors: Competitor[];
}) {
  const t = useTranslations("market.competitors");
  const locale = useLocale();

  const data = [
    { name: t("you"), share: profile.marketSharePct, isYou: true },
    ...competitors.map((c) => ({
      name: c.name,
      share: c.marketSharePct,
      isYou: false,
    })),
  ].sort((a, b) => b.share - a.share);

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "#475569" }}
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#475569" }}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 12,
            }}
            formatter={(v: number) => [`${formatPercent(v, locale)}%`, t("marketShare")]}
          />
          <Bar dataKey="share" radius={[6, 6, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.isYou ? "#2563eb" : "#94a3b8"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
