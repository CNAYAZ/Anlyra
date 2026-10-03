'use client';

import { create } from 'zustand';

/**
 * Questions the demo visitor can still ask the AI (null: not known / not the
 * demo). Shown in the top bar in place of the credit balance, which the demo
 * does not spend. Set from the server by DemoQuestionsHydrator and updated by
 * the demo chat after every answer.
 */
type DemoQuestionsState = {
  left: number | null;
  setLeft: (n: number | null) => void;
};

export const useDemoQuestionsStore = create<DemoQuestionsState>((set) => ({
  left: null,
  setLeft: (n) => set({ left: n }),
}));
