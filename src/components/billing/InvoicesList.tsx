"use client";

import { useLocale, useTranslations } from "next-intl";
import { Download } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/states/States";
import { formatCurrency, formatDate } from "@/lib/utils";

export interface InvoiceRow {
  id: string;
  number: string;
  amountCents: number;
  currency: string;
  status: "paid" | "open" | "void" | "uncollectible";
  periodEnd: string;
  pdfUrl: string | null;
}

export function InvoicesList({ invoices }: { invoices: InvoiceRow[] }) {
  const t = useTranslations("billing.invoices");
  const locale = (useLocale() as "it" | "en") ?? "it";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      {invoices.length === 0 ? (
        <EmptyState message={t("empty")} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="py-2 pr-4">{t("date")}</th>
                <th className="py-2 pr-4">#</th>
                <th className="py-2 pr-4">{t("amount")}</th>
                <th className="py-2 pr-4">{t("status")}</th>
                <th className="py-2 pr-4 text-right">{t("download")}</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-t border-slate-100">
                  <td className="py-3 pr-4 text-slate-700">
                    {formatDate(inv.periodEnd, locale)}
                  </td>
                  <td className="py-3 pr-4 text-slate-600">{inv.number}</td>
                  <td className="num py-3 pr-4 text-slate-900">
                    {formatCurrency(
                      inv.amountCents,
                      (inv.currency as "EUR" | "USD" | "GBP") ?? "EUR",
                      locale,
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <Badge variant={inv.status === "paid" ? "success" : "warning"}>
                      {inv.status}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {inv.pdfUrl ? (
                      <a
                        href={inv.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary-accent hover:underline"
                      >
                        <Download className="h-4 w-4" aria-hidden />
                        PDF
                      </a>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
