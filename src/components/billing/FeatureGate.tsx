"use client";

import type { ReactNode } from "react";
import { useFeatureGate, useIntegrationGate } from "@/lib/billing/context";
import type { FeatureKey, IntegrationKey } from "@/lib/billing/plans";
import { UpgradePrompt } from "./UpgradePrompt";

interface FeatureGateProps {
  feature: FeatureKey;
  children: ReactNode;
  fallback?: ReactNode;
  compact?: boolean;
  silent?: boolean;
}

export function FeatureGate({ feature, children, fallback, compact, silent }: FeatureGateProps) {
  const { hasAccess, requiredPlan } = useFeatureGate(feature);
  if (hasAccess) return <>{children}</>;
  if (silent) return null;
  if (fallback !== undefined) return <>{fallback}</>;
  return <UpgradePrompt requiredPlan={requiredPlan} compact={compact} />;
}

interface IntegrationGateProps {
  integration: IntegrationKey;
  children: ReactNode;
  fallback?: ReactNode;
  compact?: boolean;
  silent?: boolean;
}

export function IntegrationGate({
  integration,
  children,
  fallback,
  compact,
  silent,
}: IntegrationGateProps) {
  const { hasAccess, requiredPlan } = useIntegrationGate(integration);
  if (hasAccess) return <>{children}</>;
  if (silent) return null;
  if (fallback !== undefined) return <>{fallback}</>;
  return <UpgradePrompt requiredPlan={requiredPlan} compact={compact} />;
}
