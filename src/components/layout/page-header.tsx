"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/market", key: "market" },
  { href: "/market/competitors", key: "competitors" },
  { href: "/market/trends", key: "trends" },
  { href: "/market/positioning", key: "positioning" },
] as const;

export function MarketTabs() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <nav className="flex gap-1 border-b border-border">
      {TABS.map((tab) => {
        const active =
          tab.href === "/market" ? pathname === "/market" : pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-primary-accent text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t(tab.key)}
          </Link>
        );
      })}
    </nav>
  );
}
