'use client';

import { create } from 'zustand';

type CreditsState = {
  credits: number;
  setCredits: (n: number) => void;
};

export const useCreditsStore = create<CreditsState>((set) => ({
  credits: 0,
  setCredits: (n: number) => set({ credits: n }),
}));
