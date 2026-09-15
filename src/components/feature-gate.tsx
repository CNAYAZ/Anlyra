'use client';

import { useTranslations } from 'next-intl';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { useFeatureGate } from '@/lib/billing/context';
import type { FeatureKey } from '@/lib/billing/plans';

/**
 * Hides its children unless the organization's REAL plan includes `feature`.
 *
 * ── WHAT THIS USED TO DO, AND WHY IT WAS WRONG ──
 * It took a plan rank (`required: Plan`) and compared it against
 * `useSession((s) => s.plan)` — a zustand store in the BROWSER whose value is
 * the literal 'pro', set once as an initial value and never updated from the
 * server by anything. So the gate was not reading the customer's plan at all:
 * it was comparing one hardcoded string against another. That store also speaks
 * a different plan vocabulary (src/lib/plans.ts: free/starter/pro/enterprise)
 * from the one the product actually sells (src/lib/billing/plans.ts: PRO,
 * ADVANCED, ENTERPRISE) — the two catalogs do not even agree on which plans
 * exist, so no comparison between them could have been meaningful.
 *
 * ── WHY A FEATURE AND NOT A PLAN ──
 * Gating on the capability instead of on a plan's rank means the plan catalog
 * stays the single place that decides who gets what: move `audit_log` to
 * ADVANCED in plans.ts and every gate follows, with nothing to update here.
 * It is also the shape this component already had elsewhere before — see the
 * note about `<FeatureGate feature="ai_agent">` in ai/agent/page.tsx.
 *
 * ── FAIL-CLOSED OUTSIDE THE PROVIDER ──
 * useFeatureGate reads BillingProvider (fed the real BillingSubscription plan
 * by the dashboard layout). Rendered outside that provider, useBilling() falls
 * back to a default whose hasFeature() answers false for everything — so a
 * component mounted somewhere unexpected hides the feature rather than opening
 * it. That is the safe direction, and it is why this does NOT read
 * `usePlan().plan`: that field falls back to a fabricated "PRO", which is the
 * very kind of invented plan this change exists to remove.
 */
export function FeatureGate({
  feature,
  children
}: {
  feature: FeatureKey;
  children: React.ReactNode;
}) {
  const t = useTranslations('feature');
  const { hasAccess, requiredPlan } = useFeatureGate(feature);

  if (hasAccess) return <>{children}</>;

  // requiredPlan is null only for a feature no plan sells at all; the message
  // then names no plan rather than inventing one.
  const planLabel = requiredPlan
    ? requiredPlan.charAt(0) + requiredPlan.slice(1).toLowerCase()
    : '';

  return (
    <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <Lock className="h-5 w-5" />
      </div>
      <h3 className="mt-3 font-heading text-lg font-semibold text-foreground">{t('locked')}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {t('lockedDescription', { plan: planLabel })}
      </p>
      <Button asChild className="mt-4">
        <Link href="/#pricing">{t('upgrade')}</Link>
      </Button>
    </div>
  );
}
