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
      <div className="rounded-card border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
        {t("empty")}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-card border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-2.5">{t("date")}</th>
            <th className="px-4 py-2.5">{t("status")}</th>
            <th className="px-4 py-2.5 font-mono">{t("records")}</th>
            <th className="px-4 py-2.5">{t("error")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {logs.map((log) => (
            <tr key={log.id}>
              <td className="px-4 py-2.5 text-slate-700">
                {formatDate(new Date(log.startedAt), locale)}
              </td>
              <td className="px-4 py-2.5">
                <Badge variant={TONES[log.status]}>{log.status}</Badge>
              </td>
              <td className="px-4 py-2.5 font-mono text-slate-700">
                {log.recordsCount}
              </td>
              <td className="px-4 py-2.5 text-slate-500">
                {log.errorMessage ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
