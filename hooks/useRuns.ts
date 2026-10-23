'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { swrFetcher, fetchRunsPage, runsListPath, getRun, type RunsPage, type RunsQuery } from '@/lib/api';
import type { JobRunDetail, JobRunSummary, HookRun, StatusResponse } from '@/lib/types';

const LIVE_LIST_CONFIG = {
  keepPreviousData: true,
  revalidateOnFocus: false,
  dedupingInterval: 2000,
};

const EMPTY_RUNS: JobRunSummary[] = [];

/**
 * A single page of run summaries (no output). Works against both the keyset
 * `{runs, next_cursor}` response and the legacy bare array.
 */
export function useRunSummaries(
  query: RunsQuery = {},
  opts: { enabled?: boolean; refreshInterval?: number } = {},
) {
  const enabled = opts.enabled ?? true;
  const key = enabled ? runsListPath(query) : null;
  const { data, error, isLoading, mutate } = useSWR<RunsPage>(key, fetchRunsPage, {
    ...LIVE_LIST_CONFIG,
    refreshInterval: opts.refreshInterval ?? 8000,
  });

  return {
    runs: data?.runs ?? EMPTY_RUNS,
    hasMore: data?.hasMore ?? false,
    isLoading: isLoading && !data,
    isError: !!error,
    error,
    mutate,
  };
}

function compareRuns(a: JobRunSummary, b: JobRunSummary): number {
  // Newest first; id breaks ties the same way the keyset cursor does.
  if (a.started_at !== b.started_at) {
    return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
  }
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}

/**
 * Infinite run feed for the Runs page.
 *
 * The newest page ("head") is an ordinary SWR key, so it is polled and
 * revalidated by SSE events cheaply. Older pages are fetched on demand with
 * the keyset cursor (or `offset` against legacy backends) and kept in local
 * state, so live updates never refetch the pages the user already scrolled
 * through (useSWRInfinite would revalidate every page on each mutate).
 *
 * Merge rule on every head refresh: the fresh head wins for everything in its
 * time range; previously loaded rows are kept only if they are older than the
 * head's last row. If the fresh head shares no rows with what we had (lots of
 * new runs arrived) the older pages are dropped to avoid a silent gap.
 */
export function useRunsFeed(query: Omit<RunsQuery, 'limit'>, pageSize = 50) {
  const headQuery = useMemo(
    () => ({ ...query, limit: pageSize }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query.task_id, query.status, query.since, pageSize],
  );
  const queryKey = runsListPath(headQuery);
  const { data: head, error, isLoading } = useSWR<RunsPage>(queryKey, fetchRunsPage, {
    ...LIVE_LIST_CONFIG,
    refreshInterval: 10000,
  });

  const [older, setOlder] = useState<{
    key: string;
    rows: JobRunSummary[];
    cursor: string | null;
    hasMore: boolean;
  }>({ key: queryKey, rows: [], cursor: null, hasMore: true });
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const prevRowsRef = useRef<JobRunSummary[]>([]);

  // Reset older pages when filters change.
  const olderForQuery = older.key === queryKey ? older : null;

  const rows = useMemo(() => {
    if (!head) return EMPTY_RUNS;
    const headRows = head.runs;
    const extra = olderForQuery?.rows ?? EMPTY_RUNS;
    if (!head.hasMore || !extra.length) return headRows;
    const ids = new Set(headRows.map((r) => r.id));
    const overlap = extra.some((r) => ids.has(r.id)) || prevRowsRef.current.some((r) => ids.has(r.id));
    if (!overlap && prevRowsRef.current.length) return headRows;
    const last = headRows[headRows.length - 1];
    const tail = last ? extra.filter((r) => !ids.has(r.id) && compareRuns(last, r) < 0) : extra;
    return headRows.concat(tail);
  }, [head, olderForQuery]);

  useEffect(() => {
    prevRowsRef.current = rows;
  }, [rows]);

  const hasMore = olderForQuery && olderForQuery.rows.length
    ? olderForQuery.hasMore
    : head?.hasMore ?? false;

  const loadMore = useCallback(async () => {
    if (!head || loadingMore || !hasMore) return;
    setLoadingMore(true);
    setLoadError(null);
    try {
      const cursor = olderForQuery?.cursor ?? head.nextCursor;
      const path = head.legacy
        ? runsListPath(headQuery, { offset: rows.length })
        : runsListPath(headQuery, { before: cursor });
      const page = await fetchRunsPage(path);
      setOlder((prev) => {
        const base = prev.key === queryKey ? prev.rows : EMPTY_RUNS;
        const seen = new Set(base.map((r) => r.id));
        // Keep everything loaded so far (head rows included) so the merge
        // above always has a contiguous list.
        const merged = rows.filter((r) => !seen.has(r.id)).concat(base);
        merged.sort(compareRuns);
        const all = new Set(merged.map((r) => r.id));
        const fresh = page.runs.filter((r) => !all.has(r.id));
        return {
          key: queryKey,
          rows: merged.concat(fresh),
          cursor: page.nextCursor,
          hasMore: page.hasMore && (page.legacy ? fresh.length > 0 : true),
        };
      });
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load older runs');
    } finally {
      setLoadingMore(false);
    }
  }, [head, loadingMore, hasMore, olderForQuery, headQuery, rows, queryKey]);

  return {
    runs: rows,
    hasMore,
    loadMore,
    loadingMore,
    loadError,
    legacy: head?.legacy ?? false,
    isLoading: isLoading && !head,
    error,
  };
}

/**
 * Run metadata. Newer backends return no output here (the log viewer pages
 * it separately), so polling a running run is cheap.
 */
export function useRun(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<JobRunDetail>(
    id ? `/api/v1/runs/${id}` : null,
    () => getRun(id as string),
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
      dedupingInterval: 1000,
      // SSE run events cover transitions; polling is a safety net.
      refreshInterval: (latest?: JobRunDetail) =>
        latest?.status === 'running' || latest?.status === 'retrying' ? 3000 : 0,
    },
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
    { ...LIVE_LIST_CONFIG, refreshInterval: 12000 },
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
    { ...LIVE_LIST_CONFIG, refreshInterval: 30000 },
  );

  return {
    status: data,
    isLoading: isLoading && !data,
    isError: !!error,
    error,
    mutate,
  };
}
