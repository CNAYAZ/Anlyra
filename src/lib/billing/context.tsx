"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  PLANS,
  type PlanId,
  type FeatureKey,
  type IntegrationKey,
  type PlanLimits,
  planHasFeature,
  planHasIntegration,
  getMinPlanForFeature,
  getMinPlanForIntegration,
} from "./plans";

export interface BillingState {
  plan: PlanId;
  status: "active" | "trialing" | "past_due" | "canceled";
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  aiCreditsBalance: number;
}

interface BillingContextValue {
  state: BillingState;
  limits: PlanLimits;
  hasFeature: (feature: FeatureKey) => boolean;
  hasIntegration: (integration: IntegrationKey) => boolean;
}

const BillingContext = createContext<BillingContextValue | null>(null);

export function BillingProvider({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState: BillingState;
}) {
  const value = useMemo<BillingContextValue>(() => {
    const limits = PLANS[initialState.plan].limits;
    return {
      state: initialState,
      limits,
      hasFeature: (feature) => planHasFeature(initialState.plan, feature),
      hasIntegration: (integration) => planHasIntegration(initialState.plan, integration),
    };
  }, [initialState]);

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
}

const DEFAULT_BILLING: BillingContextValue = {
  state: {
    plan: "PRO" as PlanId,
    status: "active",
    periodEnd: null,
    cancelAtPeriodEnd: false,
    aiCreditsBalance: 0,
  },
  limits: PLANS["PRO"].limits,
  hasFeature: () => false,
  hasIntegration: () => false,
};

export function useBilling(): BillingContextValue {
  const ctx = useContext(BillingContext);
  if (!ctx) {
    return DEFAULT_BILLING;
  }
  return ctx;
}

export function usePlan() {
  const { state, limits } = useBilling();
  return {
    plan: state.plan,
    status: state.status,
    periodEnd: state.periodEnd,
    cancelAtPeriodEnd: state.cancelAtPeriodEnd,
    limits,
    aiCreditsBalance: state.aiCreditsBalance,
  };
}

export interface FeatureGateInfo {
  hasAccess: boolean;
  requiredPlan: PlanId | null;
}

export function useFeatureGate(feature: FeatureKey): FeatureGateInfo {
  const { hasFeature } = useBilling();
  return {
    hasAccess: hasFeature(feature),
    requiredPlan: getMinPlanForFeature(feature),
  };
}

export function useIntegrationGate(integration: IntegrationKey): FeatureGateInfo {
  const { hasIntegration } = useBilling();
  return {
    hasAccess: hasIntegration(integration),
    requiredPlan: getMinPlanForIntegration(integration),
  };
}
