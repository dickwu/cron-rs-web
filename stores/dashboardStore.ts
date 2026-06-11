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
  range: DashboardRange;
  taskDrawerOpen: boolean;
  setSummary: (summary: DashboardSummary) => void;
  setRecentRuns: (runs: DashboardRunSummary[]) => void;
  setActivity: (range: DashboardRange, activity: DashboardActivity) => void;
  setHeatmap: (heatmap: DashboardHeatmap) => void;
  setRange: (range: DashboardRange) => void;
  setTaskDrawerOpen: (open: boolean) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  activityByRange: {},
  range: '7d',
  taskDrawerOpen: false,
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
  setRange: (range) => set({ range }),
  setTaskDrawerOpen: (taskDrawerOpen) => set({ taskDrawerOpen }),
}));
