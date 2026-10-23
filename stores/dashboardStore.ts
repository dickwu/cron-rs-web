'use client';

import { create } from 'zustand';
import type {
  DashboardActivity,
  DashboardHeatmap,
  DashboardRange,
  DashboardRunSummary,
  DashboardSummary,
} from '@/lib/types';

interface DashboardState {
  summary?: DashboardSummary;
  recentRuns?: DashboardRunSummary[];
  activityByRange: Partial<Record<DashboardRange, DashboardActivity>>;
  heatmap?: DashboardHeatmap;
  setSummary: (summary: DashboardSummary) => void;
  setRecentRuns: (runs: DashboardRunSummary[]) => void;
  setActivity: (range: DashboardRange, activity: DashboardActivity) => void;
  setHeatmap: (heatmap: DashboardHeatmap) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  activityByRange: {},
  setSummary: (summary) => set({ summary }),
  setRecentRuns: (recentRuns) => set({ recentRuns }),
  setActivity: (range, activity) =>
    set((state) => ({
      activityByRange: {
        ...state.activityByRange,
        [range]: activity,
      },
    })),
  setHeatmap: (heatmap) => set({ heatmap }),
}));
