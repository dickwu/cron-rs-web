'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import type { Task } from '@/lib/types';

export function useTasks() {
  const { data, error, isLoading, mutate } = useSWR<Task[]>(
    '/api/v1/tasks',
    swrFetcher,
    { refreshInterval: 15000, revalidateOnFocus: true }
  );

  return {
    tasks: data || [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

export function useTask(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Task>(
    id ? `/api/v1/tasks/${id}` : null,
    swrFetcher,
    { refreshInterval: 10000, revalidateOnFocus: true }
  );

  return {
    task: data,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}
