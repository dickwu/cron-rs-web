'use client';

import { useEffect } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import type {
  DashboardActivity,
  DashboardRange,
  DashboardRunSummary,
  DashboardSummary,
} from '@/lib/types';
import { useDashboardStore } from '@/stores/dashboardStore';

const DASHBOARD_SWR_CONFIG = {
  keepPreviousData: true,
  revalidateOnFocus: false,
  dedupingInterval: 2000,
};

export function useDashboardSummary() {
  const cached = useDashboardStore((state) => state.summary);
  const setSummary = useDashboardStore((state) => state.setSummary);
  const { data, error, isLoading, mutate } = useSWR<DashboardSummary>(
    '/api/v1/dashboard/summary',
    swrFetcher,
    { ...DASHBOARD_SWR_CONFIG, refreshInterval: 15000 }
  );

  useEffect(() => {
    if (data) setSummary(data);
  }, [data, setSummary]);

  const summary = data || cached;
  return {
    summary,
    isLoading: isLoading && !summary,
    isError: !!error,
    error,
    mutate,
  };
}

export function useDashboardRecentRuns(limit = 20) {
  const cached = useDashboardStore((state) => state.recentRuns);
  const setRecentRuns = useDashboardStore((state) => state.setRecentRuns);
  const { data, error, isLoading, mutate } = useSWR<DashboardRunSummary[]>(
    `/api/v1/dashboard/runs?limit=${limit}`,
    swrFetcher,
    { ...DASHBOARD_SWR_CONFIG, refreshInterval: 8000 }
  );

  useEffect(() => {
    if (data) setRecentRuns(data);
  }, [data, setRecentRuns]);

  const runs = data || cached || [];
  return {
    runs,
    isLoading: isLoading && !cached,
    isError: !!error,
    error,
    mutate,
  };
}

export function useDashboardActivity(range: DashboardRange) {
  const cached = useDashboardStore((state) => state.activityByRange[range]);
  const setActivity = useDashboardStore((state) => state.setActivity);
  const { data, error, isLoading, mutate } = useSWR<DashboardActivity>(
    `/api/v1/dashboard/activity?range=${range}`,
    swrFetcher,
    { ...DASHBOARD_SWR_CONFIG, refreshInterval: 30000 }
  );

  useEffect(() => {
    if (data) setActivity(range, data);
  }, [data, range, setActivity]);

  const activity = data || cached;
  return {
    activity,
    isLoading: isLoading && !activity,
    isError: !!error,
    error,
    mutate,
  };
}
