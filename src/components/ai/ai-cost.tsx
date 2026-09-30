'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { maxCreditsFor, typicalCreditsFor, type AiOperation } from '@/lib/ai/credit-cost';

/**
 * The cost texts of an AI operation, from the same numbers the server reserves
 * and charges (@/lib/ai/credit-cost) — never a second copy of them here.
 */
export function useAiCost() {
  const t = useTranslations('aiCost');
  return {
    /** What the route reserves: below this balance the operation is refused. */
    max: (op: AiOperation) => maxCreditsFor(op),
    /** "circa N, al massimo M crediti" — or just "M crediti" when N equals M. */
    label: (op: AiOperation) => {
      const typical = typicalCreditsFor(op);
      const max = maxCreditsFor(op);
      return typical === max ? t('exact', { count: max }) : t('range', { typical, max });
    },
    /** The refusal when the balance is below the maximum (founder's wording). */
    insufficient: (op: AiOperation, balance: number) =>
      t('insufficient', { max: maxCreditsFor(op), balance }),
    /** "Costo: N crediti" for an operation that has finished. */
    charged: (credits: number) => t('charged', { count: credits }),
  };
}

/** The real cost of an answer, shown under it. */
export function AiCostCharged({ credits, className }: { credits: number; className?: string }) {
  const t = useTranslations('aiCost');
  return (
    <p className={cn('text-xs tabular-nums text-muted-foreground', className)}>
      {t('charged', { count: credits })}
    </p>
  );
}
