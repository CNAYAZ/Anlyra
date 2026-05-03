'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Plan } from '@/lib/plan';

interface PlanState {
  plan: Plan;
  setPlan: (plan: Plan) => void;
}

export const usePlanStore = create<PlanState>()(
  persist(
    (set) => ({
      plan: 'pro',
      setPlan: (plan) => set({ plan }),
    }),
    {
      name: 'pro.plan.v1',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
