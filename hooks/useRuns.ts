'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import type { JobRun, HookRun, StatusResponse } from '@/lib/types';

export function useRuns(params?: {
  task_id?: string;
  status?: string;
  limit?: number;
  offset?: number;
  since?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.task_id) searchParams.set('task_id', params.task_id);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));
  if (params?.since) searchParams.set('since', params.since);
  const qs = searchParams.toString();
  const key = `/api/v1/runs${qs ? `?${qs}` : ''}`;

  const { data, error, isLoading, mutate } = useSWR<JobRun[]>(
    key,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  return {
    runs: data || [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

export function useRun(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<JobRun>(
    id ? `/api/v1/runs/${id}` : null,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  return {
    run: data,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

export function useHookRuns(runId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<HookRun[]>(
    runId ? `/api/v1/runs/${runId}/hooks` : null,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  return {
    hookRuns: data || [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

export function useStatus() {
  const { data, error, isLoading, mutate } = useSWR<StatusResponse>(
    '/api/v1/status',
    swrFetcher,
    { refreshInterval: 30000, revalidateOnFocus: false }
  );

  return {
    status: data,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}
