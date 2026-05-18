'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Plan } from './plans';

type SessionState = {
  plan: Plan;
  setPlan: (p: Plan) => void;
  onboardingCompleted: boolean;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
};

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      plan: 'pro',
      setPlan: (plan) => set({ plan }),
      onboardingCompleted: false,
      completeOnboarding: () => set({ onboardingCompleted: true }),
      resetOnboarding: () => set({ onboardingCompleted: false })
    }),
    { name: 'pro:session' }
  )
);
