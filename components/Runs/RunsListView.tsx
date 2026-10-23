'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Icon } from '@/components/ui/icons';
import { StatusPill } from '@/components/ui/StatusPill';
import { Tag } from '@/components/ui/Tag';
import { useRunsFeed } from '@/hooks/useRuns';
import { useTasks } from '@/hooks/useTasks';
import { relTime, fmtDuration } from '@/lib/date';
import { navPush } from '@/lib/navigation';
import type { JobRunSummary } from '@/lib/types';

// Server-side status filters (one status per request, so each filter pages
// independently through the full history).
const STATUS_FILTERS: Array<{ k: string; label: string }> = [
  { k: 'all', label: 'All' },
  { k: 'failed', label: 'Failed' },
  { k: 'timeout', label: 'Timed out' },
  { k: 'crashed', label: 'Crashed' },
  { k: 'running', label: 'Running' },
  { k: 'retrying', label: 'Retrying' },
  { k: 'success', label: 'Succeeded' },
  { k: 'skipped', label: 'Skipped' },
];

const PAGE_SIZE = 100;
const ROW_ESTIMATE = 53;
/** Start fetching the next page this many rows before the end. */
const PREFETCH_ROWS = 15;

type Row = JobRunSummary & { task_name: string };

export function RunsListView() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [taskFilter, setTaskFilter] = useState<string>('');
  const [q, setQ] = useState('');

  const query = useMemo(
    () => ({
      status: statusFilter === 'all' ? undefined : statusFilter,
      task_id: taskFilter || undefined,
    }),
    [statusFilter, taskFilter],
  );
  const { runs, hasMore, loadMore, loadingMore, loadError, isLoading, error } = useRunsFeed(
    query,
    PAGE_SIZE,
  );
  const { tasks } = useTasks();
  const tasksById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => a.name.localeCompare(b.name)),
    [tasks],
  );

  const rows: Row[] = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out: Row[] = [];
    for (const r of runs) {
      const task_name = tasksById.get(r.task_id)?.name || r.task_id;
      if (
        needle &&
        !task_name.toLowerCase().includes(needle) &&
        !r.id.toLowerCase().includes(needle)
      ) {
        continue;
      }
      out.push({ ...r, task_name });
    }
    return out;
  }, [runs, tasksById, q]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_ESTIMATE,
    overscan: 12,
    getItemKey: (i) => rows[i]?.id ?? i,
  });
  const items = virtualizer.getVirtualItems();
  const lastIndex = items.length ? items[items.length - 1].index : -1;

  // Infinite scroll: fetch the next page as the end comes into view. A
  // client-side search can hide most rows, so keep going while it does.
  useEffect(() => {
    if (!hasMore || loadingMore || loadError || isLoading) return;
    if (lastIndex >= rows.length - PREFETCH_ROWS) loadMore();
  }, [lastIndex, rows.length, hasMore, loadingMore, loadError, isLoading, loadMore]);

  // Back to the top when filters change.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [statusFilter, taskFilter]);

  const paddingTop = items.length ? items[0].start : 0;
  const paddingBottom = items.length ? virtualizer.getTotalSize() - items[items.length - 1].end : 0;
  const open = (id: string) => navPush(router, `/runs?id=${id}`);

  let footer: React.ReactNode;
  if (loadError) {
    footer = (
      <>
        <span style={{ color: 'var(--c-error)' }}>
          Couldn&apos;t load older runs: {loadError}. Check the connection, then try again.
        </span>
        <button className="btn sm" onClick={loadMore}>
          Try again
        </button>
      </>
    );
  } else if (loadingMore) {
    footer = (
      <span className="muted">
        <Icon.spinner size={12} /> Loading older runs…
      </span>
    );
  } else if (hasMore) {
    footer = (
      <button className="btn sm" onClick={loadMore}>
        Load older runs
      </button>
    );
  } else if (runs.length) {
    footer = <span className="muted">Start of history. Every matching run is loaded.</span>;
  }

  const filterActive = statusFilter !== 'all' || !!taskFilter;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Runs</div>
          <div className="page-subtitle">
            {isLoading
              ? 'Loading runs…'
              : `${runs.length.toLocaleString()} loaded${hasMore ? ', more on scroll' : ''}`}
          </div>
        </div>
        <div className="flex gap-2 runs-toolbar">
          <select
            className="select"
            aria-label="Filter by task"
            value={taskFilter}
            onChange={(e) => setTaskFilter(e.target.value)}
            style={{ width: 200 }}
          >
            <option value="">All tasks</option>
            {sortedTasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <div style={{ position: 'relative' }}>
            <Icon.search
              size={13}
              style={{ position: 'absolute', left: 10, top: 9, color: 'var(--text-muted)' }}
            />
            <input
              className="input"
              type="search"
              aria-label="Search loaded runs by task name or run id"
              placeholder="Search loaded runs…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ paddingLeft: 30, width: 240 }}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-4" style={{ flexWrap: 'wrap' }} role="group" aria-label="Filter by status">
        {STATUS_FILTERS.map((opt) => (
          <Tag
            key={opt.k}
            active={statusFilter === opt.k}
            subtle={statusFilter !== opt.k}
            onClick={() => setStatusFilter(opt.k)}
          >
            {opt.label}
          </Tag>
        ))}
      </div>

      <div className="card">
        <div className="card-body flush runs-scroll" ref={scrollRef}>
          <table className="t-table runs-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Status</th>
                <th>Started</th>
                <th className="col-optional">Duration</th>
                <th className="col-optional">Attempt</th>
                <th className="text-right">Exit</th>
              </tr>
            </thead>
            <tbody>
              {paddingTop > 0 && (
                <tr aria-hidden style={{ height: paddingTop }}>
                  <td colSpan={6} style={{ padding: 0, border: 0 }} />
                </tr>
              )}
              {items.map((vi) => {
                const r = rows[vi.index];
                return (
                  <tr
                    key={vi.key}
                    data-index={vi.index}
                    ref={virtualizer.measureElement}
                    tabIndex={0}
                    onClick={() => open(r.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') open(r.id);
                    }}
                    aria-label={`${r.task_name}, ${r.status}, started ${relTime(r.started_at)}`}
                  >
                    <td>
                      <div className="fw-500">{r.task_name}</div>
                      <div className="mono fz-11 muted">{r.id}</div>
                    </td>
                    <td className="shrink">
                      <StatusPill status={r.status} />
                    </td>
                    <td className="shrink muted">
                      <span title={r.started_at}>{relTime(r.started_at)}</span>
                    </td>
                    <td className="shrink mono fz-12 col-optional">{fmtDuration(r.duration_ms)}</td>
                    <td className="shrink mono fz-12 col-optional">{r.attempt}</td>
                    <td
                      className="shrink mono fz-12 text-right"
                      style={{
                        color:
                          r.exit_code === 0
                            ? 'var(--text-secondary)'
                            : r.exit_code != null
                            ? 'var(--c-error)'
                            : 'var(--text-faint)',
                      }}
                    >
                      {r.exit_code ?? '—'}
                    </td>
                  </tr>
                );
              })}
              {paddingBottom > 0 && (
                <tr aria-hidden style={{ height: paddingBottom }}>
                  <td colSpan={6} style={{ padding: 0, border: 0 }} />
                </tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-cell">
                    {error ? (
                      <span style={{ color: 'var(--c-error)' }}>
                        Couldn&apos;t load runs: {error instanceof Error ? error.message : 'request failed'}.
                        Check the API URL in Settings.
                      </span>
                    ) : q && runs.length ? (
                      hasMore
                        ? 'No loaded runs match this search. Older runs are still loading.'
                        : 'No runs match this search.'
                    ) : filterActive ? (
                      'No runs match these filters. Choose All to see every run.'
                    ) : (
                      'No runs yet. Runs appear here when a task fires or you run one from Tasks.'
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {footer && <div className="runs-footer">{footer}</div>}
        </div>
      </div>
      {q && (
        <div className="muted fz-12 mt-2">
          Search covers the {runs.length.toLocaleString()} runs loaded so far. Filter by task or status
          to search further back.
        </div>
      )}
    </>
  );
}
