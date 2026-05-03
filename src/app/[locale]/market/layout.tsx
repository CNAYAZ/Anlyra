import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/layout/topbar";
import { MarketTabs } from "@/components/layout/page-header";

export default async function MarketLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations("market");
  return (
    <>
      <Topbar title={t("title")} subtitle={t("subtitle")} />
      <div className="px-6 pt-4">
        <MarketTabs />
      </div>
      <div className="flex-1 px-6 pb-10 pt-6">{children}</div>
    </>
  );
}
