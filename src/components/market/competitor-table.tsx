"use client";

import { useTranslations } from "next-intl";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCompactCurrency, formatNumber, formatPercent } from "@/lib/format";
import { useAppLocale } from "@/hooks/use-locale";
import type { Competitor } from "@/types/market";

export function CompetitorTable({
  competitors,
  onEdit,
  onDelete,
}: {
  competitors: Competitor[];
  onEdit: (c: Competitor) => void;
  onDelete: (c: Competitor) => void;
}) {
  const t = useTranslations("market.competitors");
  const tCommon = useTranslations("common");
  const locale = useAppLocale();

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left font-medium">{t("name")}</th>
            <th className="px-4 py-3 text-left font-medium">{t("website")}</th>
            <th className="px-4 py-3 text-right font-medium">{t("revenue")}</th>
            <th className="px-4 py-3 text-right font-medium">{t("employees")}</th>
            <th className="px-4 py-3 text-right font-medium">{t("marketShare")}</th>
            <th className="px-4 py-3 text-left font-medium">{t("strengths")}</th>
            <th className="px-4 py-3 text-left font-medium">{t("weaknesses")}</th>
            <th className="px-4 py-3 text-right font-medium">{tCommon("actions")}</th>
          </tr>
        </thead>
        <tbody>
          {competitors.map((c, i) => (
            <tr
              key={c.id}
              className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}
            >
              <td className="px-4 py-3 font-medium">{c.name}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {c.website ? (
                  <a
                    href={c.website}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-primary hover:underline"
                  >
                    {c.website.replace(/^https?:\/\//, "")}
                  </a>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3 text-right font-mono tabular-nums">
                {formatCompactCurrency(c.revenue, locale)}
              </td>
              <td className="px-4 py-3 text-right font-mono tabular-nums">
                {formatNumber(c.employees, locale)}
              </td>
              <td className="px-4 py-3 text-right font-mono tabular-nums">
                {formatPercent(c.marketSharePct, locale)}%
              </td>
              <td className="px-4 py-3 align-top">
                <ul className="space-y-1 text-xs text-foreground/80">
                  {c.strengths.slice(0, 3).map((s) => (
                    <li key={s} className="flex items-start gap-1.5">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-success" />
                      {s}
                    </li>
                  ))}
                </ul>
              </td>
              <td className="px-4 py-3 align-top">
                <ul className="space-y-1 text-xs text-foreground/80">
                  {c.weaknesses.slice(0, 3).map((s) => (
                    <li key={s} className="flex items-start gap-1.5">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-danger" />
                      {s}
                    </li>
                  ))}
                </ul>
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(c)}
                    aria-label={tCommon("edit")}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(c)}
                    aria-label={tCommon("delete")}
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
