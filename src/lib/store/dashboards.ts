'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Dashboard, Widget } from '@/lib/widgets/types';
import { generateId } from '@/lib/utils';

interface DashboardsState {
  dashboards: Dashboard[];
  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  createDashboard: (name?: string) => Dashboard;
  updateDashboard: (id: string, patch: Partial<Pick<Dashboard, 'name' | 'widgets'>>) => void;
  deleteDashboard: (id: string) => void;
  getDashboard: (id: string) => Dashboard | undefined;
  duplicateDashboard: (id: string) => Dashboard | undefined;
}

export const useDashboardsStore = create<DashboardsState>()(
  persist(
    (set, get) => ({
      dashboards: [],
      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),
      createDashboard: (name) => {
        const now = new Date().toISOString();
        const dashboard: Dashboard = {
          id: generateId('db'),
          name: name?.trim() || 'Untitled dashboard',
          widgets: [],
          createdAt: now,
          updatedAt: now,
        };
        set({ dashboards: [dashboard, ...get().dashboards] });
        return dashboard;
      },
      updateDashboard: (id, patch) => {
        set({
          dashboards: get().dashboards.map((d) =>
            d.id === id ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d,
          ),
        });
      },
      deleteDashboard: (id) => {
        set({ dashboards: get().dashboards.filter((d) => d.id !== id) });
      },
      getDashboard: (id) => get().dashboards.find((d) => d.id === id),
      duplicateDashboard: (id) => {
        const original = get().dashboards.find((d) => d.id === id);
        if (!original) return undefined;
        const now = new Date().toISOString();
        const copy: Dashboard = {
          ...original,
          id: generateId('db'),
          name: `${original.name} (copy)`,
          widgets: original.widgets.map<Widget>((w) => ({ ...w, id: generateId('w') })),
          createdAt: now,
          updatedAt: now,
        };
        set({ dashboards: [copy, ...get().dashboards] });
        return copy;
      },
    }),
    {
      name: 'pro.custom-dashboards.v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ dashboards: state.dashboards }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
