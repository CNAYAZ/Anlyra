"use client";

import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export interface SyncLogRow {
  id: string;
  status: "SUCCESS" | "ERROR" | "RUNNING";
  recordsCount: number;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
}

interface Props {
  logs: SyncLogRow[];
}

const TONES: Record<SyncLogRow["status"], "success" | "danger" | "info"> = {
  SUCCESS: "success",
  ERROR: "danger",
  RUNNING: "info",
};

export function SyncLogTable({ logs }: Props) {
  const t = useTranslations("integrations.logs");
  const locale = useLocale();

  if (logs.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        {t("empty")}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-card border border-border">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-2.5">{t("date")}</th>
            <th className="px-4 py-2.5">{t("status")}</th>
            <th className="px-4 py-2.5 font-mono">{t("records")}</th>
            <th className="px-4 py-2.5">{t("error")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50 bg-card">
          {logs.map((log) => (
            <tr key={log.id}>
              <td className="px-4 py-2.5 text-foreground">
                {formatDate(new Date(log.startedAt), locale)}
              </td>
              <td className="px-4 py-2.5">
                <Badge variant={TONES[log.status]}>{log.status}</Badge>
              </td>
              <td className="px-4 py-2.5 font-mono text-foreground">
                {log.recordsCount}
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {log.errorMessage ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
