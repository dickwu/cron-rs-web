'use client';

import { create } from 'zustand';

interface UiState {
  taskDrawerOpen: boolean;
  editingTaskId: string | null;
  taskQuery: string;
  taskSelectedTags: string[];
  runTaskFilter: string;
  runStatusFilter: string;
  runSelectedTags: string[];
  runPage: number;
  runPageSize: number;
  hooksQuery: string;
  setTaskDrawerOpen: (open: boolean) => void;
  setEditingTaskId: (taskId: string | null) => void;
  setTaskQuery: (query: string) => void;
  setTaskSelectedTags: (tags: string[]) => void;
  setRunTaskFilter: (taskId: string) => void;
  setRunStatusFilter: (status: string) => void;
  setRunSelectedTags: (tags: string[]) => void;
  setRunPage: (page: number) => void;
  setRunPageSize: (pageSize: number) => void;
  setHooksQuery: (query: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  taskDrawerOpen: false,
  editingTaskId: null,
  taskQuery: '',
  taskSelectedTags: [],
  runTaskFilter: '',
  runStatusFilter: '',
  runSelectedTags: [],
  runPage: 1,
  runPageSize: 20,
  hooksQuery: '',
  setTaskDrawerOpen: (taskDrawerOpen) => set({ taskDrawerOpen }),
  setEditingTaskId: (editingTaskId) => set({ editingTaskId }),
  setTaskQuery: (taskQuery) => set({ taskQuery }),
  setTaskSelectedTags: (taskSelectedTags) => set({ taskSelectedTags }),
  setRunTaskFilter: (runTaskFilter) => set({ runTaskFilter, runPage: 1 }),
  setRunStatusFilter: (runStatusFilter) => set({ runStatusFilter, runPage: 1 }),
  setRunSelectedTags: (runSelectedTags) => set({ runSelectedTags, runPage: 1 }),
  setRunPage: (runPage) => set({ runPage }),
  setRunPageSize: (runPageSize) => set({ runPageSize }),
  setHooksQuery: (hooksQuery) => set({ hooksQuery }),
}));
