'use client';

import { create } from 'zustand';

type CreditsState = {
  credits: number;
  max: number;
  setCredits: (n: number) => void;
  setMax: (n: number) => void;
};

export const useCreditsStore = create<CreditsState>((set) => ({
  credits: 0,
  max: 0,
  setCredits: (n: number) => set({ credits: n }),
  setMax: (n: number) => set({ max: n }),
}));
