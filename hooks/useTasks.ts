'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import type { Task, TaskDetailResponse, TaskSummary } from '@/lib/types';

const TASK_SWR_CONFIG = {
  keepPreviousData: true,
  revalidateOnFocus: false,
  dedupingInterval: 2000,
};

export function useTasks() {
  const { data, error, isLoading, mutate } = useSWR<TaskSummary[]>(
    '/api/v1/tasks',
    swrFetcher,
    { ...TASK_SWR_CONFIG, refreshInterval: 30000 }
  );

  return {
    tasks: data || [],
    isLoading: isLoading && !data,
    isError: !!error,
    error,
    mutate,
  };
}

export function useTask(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Task>(
    id ? `/api/v1/tasks/${id}` : null,
    swrFetcher,
    { ...TASK_SWR_CONFIG, refreshInterval: 15000 }
  );

  return {
    task: data,
    isLoading: isLoading && !data,
    isError: !!error,
    error,
    mutate,
  };
}

export function useTaskDetail(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<TaskDetailResponse>(
    id ? `/api/v1/tasks/${id}/detail` : null,
    swrFetcher,
    { ...TASK_SWR_CONFIG, refreshInterval: 15000 }
  );

  return {
    detail: data,
    isLoading: isLoading && !data,
    isError: !!error,
    error,
    mutate,
  };
}
