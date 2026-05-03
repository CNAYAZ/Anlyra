'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GeneratedReport, ScheduledReport, ReportConfig } from './types';

interface ReportsState {
  reports: GeneratedReport[];
  scheduled: ScheduledReport[];
  addReport: (report: GeneratedReport) => void;
  removeReport: (id: string) => void;
  setShareEnabled: (id: string, enabled: boolean) => void;
  addScheduled: (s: ScheduledReport) => void;
  updateScheduled: (id: string, patch: Partial<ScheduledReport>) => void;
  removeScheduled: (id: string) => void;
}

const seedReports: GeneratedReport[] = [
  {
    id: 'rep-001',
    title: 'Q1 2026 — Executive Summary',
    type: 'executive',
    createdAt: '2026-04-12T09:30:00Z',
    status: 'ready',
    sizeBytes: 482_310,
    shareEnabled: false,
    config: {
      type: 'executive',
      period: '3m',
      sections: ['executive', 'recommendations'],
      language: 'it',
      includeCharts: true,
      title: 'Q1 2026 — Executive Summary',
    },
  },
  {
    id: 'rep-002',
    title: 'Finance Deep Dive — March 2026',
    type: 'finance',
    createdAt: '2026-04-03T14:12:00Z',
    status: 'ready',
    sizeBytes: 891_040,
    shareEnabled: true,
    shareToken: 'shr_demo_t0k3n',
    config: {
      type: 'finance',
      period: '1m',
      sections: ['finance', 'cashflow', 'projections'],
      language: 'en',
      includeCharts: true,
      title: 'Finance Deep Dive — March 2026',
    },
  },
];

export const useReportsStore = create<ReportsState>()(
  persist(
    (set) => ({
      reports: seedReports,
      scheduled: [],
      addReport: (report) =>
        set((s) => ({ reports: [report, ...s.reports] })),
      removeReport: (id) =>
        set((s) => ({ reports: s.reports.filter((r) => r.id !== id) })),
      setShareEnabled: (id, enabled) =>
        set((s) => ({
          reports: s.reports.map((r) =>
            r.id === id
              ? {
                  ...r,
                  shareEnabled: enabled,
                  shareToken: enabled
                    ? r.shareToken ?? `shr_${Math.random().toString(36).slice(2, 12)}`
                    : r.shareToken,
                }
              : r
          ),
        })),
      addScheduled: (s) => set((st) => ({ scheduled: [s, ...st.scheduled] })),
      updateScheduled: (id, patch) =>
        set((st) => ({
          scheduled: st.scheduled.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        })),
      removeScheduled: (id) =>
        set((st) => ({ scheduled: st.scheduled.filter((s) => s.id !== id) })),
    }),
    { name: 'pro-reports-store' }
  )
);
