"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = ["q1", "q2", "q3", "q4", "q5"] as const;

export function FaqAccordion() {
  const t = useTranslations("pricing.faq");
  const [open, setOpen] = useState<string | null>(null);

  return (
    <ul className="divide-y divide-slate-200 rounded-card border border-slate-200 bg-white">
      {ITEMS.map((q) => {
        const isOpen = open === q;
        return (
          <li key={q}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : q)}
              className="flex w-full items-center justify-between gap-3 p-4 text-left"
              aria-expanded={isOpen}
            >
              <span className="font-heading font-medium text-slate-900">{t(q)}</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-slate-500 transition-transform",
                  isOpen && "rotate-180",
                )}
                aria-hidden
              />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <p className="px-4 pb-4 text-sm text-slate-600">
                    {t(q.replace("q", "a") as "a1")}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}
