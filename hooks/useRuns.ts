'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import type { JobRun, JobRunSummary, HookRun, StatusResponse } from '@/lib/types';

const LIVE_LIST_CONFIG = {
  keepPreviousData: true,
  revalidateOnFocus: false,
  dedupingInterval: 2000,
};

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
    { ...LIVE_LIST_CONFIG, refreshInterval: 8000 }
  );

  return {
    runs: data || [],
    isLoading: isLoading && !data,
    isError: !!error,
    error,
    mutate,
  };
}

export function useRunSummaries(params?: {
  task_id?: string;
  status?: string;
  limit?: number;
  offset?: number;
  since?: string;
}) {
  const searchParams = new URLSearchParams();
  searchParams.set('include_output', 'false');
  if (params?.task_id) searchParams.set('task_id', params.task_id);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));
  if (params?.since) searchParams.set('since', params.since);
  const key = `/api/v1/runs?${searchParams.toString()}`;

  const { data, error, isLoading, mutate } = useSWR<JobRunSummary[]>(
    key,
    swrFetcher,
    { ...LIVE_LIST_CONFIG, refreshInterval: 8000 }
  );

  return {
    runs: data || [],
    isLoading: isLoading && !data,
    isError: !!error,
    error,
    mutate,
  };
}

export function useRun(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<JobRun>(
    id ? `/api/v1/runs/${id}` : null,
    swrFetcher,
    { ...LIVE_LIST_CONFIG, refreshInterval: 8000 }
  );

  return {
    run: data,
    isLoading: isLoading && !data,
    isError: !!error,
    error,
    mutate,
  };
}

export function useHookRuns(runId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<HookRun[]>(
    runId ? `/api/v1/runs/${runId}/hooks` : null,
    swrFetcher,
    { ...LIVE_LIST_CONFIG, refreshInterval: 12000 }
  );

  return {
    hookRuns: data || [],
    isLoading: isLoading && !data,
    isError: !!error,
    error,
    mutate,
  };
}

export function useStatus() {
  const { data, error, isLoading, mutate } = useSWR<StatusResponse>(
    '/api/v1/status',
    swrFetcher,
    { ...LIVE_LIST_CONFIG, refreshInterval: 30000 }
  );

  return {
    status: data,
    isLoading: isLoading && !data,
    isError: !!error,
    error,
    mutate,
  };
}
