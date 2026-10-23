'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { ApiError, schedulePreviewPath, swrFetcher } from '@/lib/api';
import { browserTimeZone, isValidTimeZone, nextRuns } from '@/lib/calendar';
import { normalizeScheduleExpression } from '@/lib/schedule';
import type { SchedulePreviewResponse } from '@/lib/types';
import { useStatus } from './useRuns';

/**
 * The timezone systemd evaluates timers in, as reported by the daemon on
 * `/api/v1/status`. `serverKnown` is false for older daemons that don't
 * report it (or report null); callers then fall back to the browser zone.
 */
export function useServerTimeZone(): { timeZone: string; serverKnown: boolean } {
  const { status } = useStatus();
  const tz = status?.timezone;
  return useMemo(
    () =>
      isValidTimeZone(tz)
        ? { timeZone: tz, serverKnown: true }
        : { timeZone: browserTimeZone(), serverKnown: false },
    [tz],
  );
}

// Remember (per page load) that the daemon has no preview endpoint so we stop
// asking and go straight to the client-side computation.
let previewUnsupported = false;

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

export interface SchedulePreview {
  runs: Date[];
  /** Where the times came from. */
  source: 'server' | 'client' | 'none';
  /** Validation error from the daemon (400) or local normalization. */
  error: string | null;
  timeZone: string;
  serverTimeZoneKnown: boolean;
  isLoading: boolean;
}

/**
 * Next `count` fire times for `schedule`. Uses the daemon's
 * `GET /api/v1/schedule/preview` (systemd-accurate) and falls back to the
 * client-side OnCalendar evaluator when the endpoint is missing (404) or
 * unreachable.
 */
export function useSchedulePreview(schedule: string, count = 5): SchedulePreview {
  const { timeZone, serverKnown } = useServerTimeZone();
  const debounced = useDebounced(schedule.trim(), 300);

  const normalized = useMemo((): { expr: string | null; error: string | null } => {
    if (!debounced) return { expr: null, error: null };
    try {
      return { expr: normalizeScheduleExpression(debounced), error: null };
    } catch (err) {
      return { expr: null, error: err instanceof Error ? err.message : String(err) };
    }
  }, [debounced]);

  const [unsupported, setUnsupported] = useState(previewUnsupported);
  const key = normalized.expr && !unsupported ? schedulePreviewPath(normalized.expr, count) : null;

  const { data, error, isLoading } = useSWR<SchedulePreviewResponse>(key, swrFetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
    dedupingInterval: 10_000,
    refreshInterval: 60_000,
    keepPreviousData: false,
  });

  useEffect(() => {
    if (error instanceof ApiError && (error.status === 404 || error.status === 405)) {
      previewUnsupported = true;
      setUnsupported(true);
    }
  }, [error]);

  return useMemo((): SchedulePreview => {
    const base = { timeZone, serverTimeZoneKnown: serverKnown };
    if (normalized.error) {
      return { ...base, runs: [], source: 'none', error: normalized.error, isLoading: false };
    }
    if (!normalized.expr) {
      return { ...base, runs: [], source: 'none', error: null, isLoading: false };
    }
    if (data && Array.isArray(data.next_runs)) {
      const runs = data.next_runs
        .map((s) => new Date(s))
        .filter((d) => !Number.isNaN(d.getTime()));
      return { ...base, runs, source: 'server', error: null, isLoading: false };
    }
    if (error instanceof ApiError && error.status === 400) {
      return { ...base, runs: [], source: 'none', error: error.message, isLoading: false };
    }
    if (key && isLoading && !error) {
      return { ...base, runs: [], source: 'none', error: null, isLoading: true };
    }
    const runs = nextRuns(normalized.expr, { count, timeZone });
    return { ...base, runs, source: runs.length ? 'client' : 'none', error: null, isLoading: false };
  }, [normalized, data, error, isLoading, key, count, timeZone, serverKnown]);
}
