'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/icons';
import { StatusPill } from '@/components/ui/StatusPill';
import { Tag } from '@/components/ui/Tag';
import { useRunSummaries } from '@/hooks/useRuns';
import { useRollingSince } from '@/hooks/useRollingSince';
import { useTasks } from '@/hooks/useTasks';
import { relTime, fmtDuration } from '@/lib/date';
import { navPush } from '@/lib/navigation';

const STATUS_FILTERS: Array<{ k: string; label: string }> = [
  { k: 'all', label: 'All' },
  { k: 'success', label: 'Success' },
  { k: 'failed', label: 'Failed' },
  { k: 'running', label: 'Running' },
  { k: 'retrying', label: 'Retrying' },
  { k: 'skipped', label: 'Skipped' },
];

const PAGE_SIZE = 50;
const FETCH_STEP = 1000;
const FETCH_MAX = 10_000;
const WINDOW_MS = 7 * 86400 * 1000;

export function RunsListView() {
  const router = useRouter();
  // Rolling 7-day window; advances every minute instead of freezing at mount.
  const since = useRollingSince(WINDOW_MS);
  // Cap the fetch: at production volume an uncapped 7-day window is tens of
  // thousands of rows per poll. The list shows the most recent runs first and
  // the user can raise the cap with "Load more".
  const [limit, setLimit] = useState(FETCH_STEP);
  const { runs } = useRunSummaries({ since, limit });
  const hitLimit = runs.length >= limit;
  const { tasks } = useTasks();
  const tasksById = useMemo(() => Object.fromEntries(tasks.map((t) => [t.id, t])), [tasks]);

  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(0);

  const enriched = useMemo(
    () =>
      runs.map((r) => ({
        ...r,
        task_name: tasksById[r.task_id]?.name || r.task_id,
      })),
    [runs, tasksById],
  );

  const filtered = useMemo(() => {
    return enriched.filter((r) => {
      if (statusFilter !== 'all') {
        if (statusFilter === 'failed' && r.status !== 'failed' && r.status !== 'timeout' && r.status !== 'crashed') return false;
        if (statusFilter !== 'failed' && r.status !== statusFilter) return false;
      }
      if (!q) return true;
      const s = q.toLowerCase();
      return r.task_name.toLowerCase().includes(s) || r.id.toLowerCase().includes(s);
    });
  }, [enriched, q, statusFilter]);

  const counts = useMemo(
    () => ({
      all: enriched.length,
      success: enriched.filter((r) => r.status === 'success').length,
      failed: enriched.filter(
        (r) => r.status === 'failed' || r.status === 'timeout' || r.status === 'crashed',
      ).length,
      running: enriched.filter((r) => r.status === 'running').length,
      retrying: enriched.filter((r) => r.status === 'retrying').length,
      skipped: enriched.filter((r) => r.status === 'skipped').length,
    }),
    [enriched],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Runs</div>
          <div className="page-subtitle">
            {filtered.length} of {enriched.length} runs · last 7 days
            {hitLimit && ` · most recent ${limit.toLocaleString()} loaded`}
          </div>
        </div>
        <div className="flex gap-2">
          <div style={{ position: 'relative' }}>
            <Icon.search
              size={13}
              style={{
                position: 'absolute',
                left: 10,
                top: 9,
                color: 'var(--text-muted)',
              }}
            />
            <input
              className="input"
              placeholder="Search by task or run id…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              style={{ paddingLeft: 30, width: 280 }}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-4" style={{ flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map((opt) => (
          <Tag
            key={opt.k}
            active={statusFilter === opt.k}
            subtle={statusFilter !== opt.k}
            onClick={() => {
              setStatusFilter(opt.k);
              setPage(0);
            }}
          >
            {opt.label}{' '}
            <span className="mono" style={{ marginLeft: 4, color: 'var(--text-faint)' }}>
              {counts[opt.k as keyof typeof counts]}
            </span>
          </Tag>
        ))}
      </div>

      <div className="card">
        <div className="card-body flush">
          <table className="t-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Status</th>
                <th>Started</th>
                <th>Duration</th>
                <th>Attempt</th>
                <th className="text-right">Exit</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.id} onClick={() => navPush(router, `/runs?id=${r.id}`)}>
                  <td>
                    <div className="fw-500">{r.task_name}</div>
                    <div className="mono fz-11 muted">{r.id}</div>
                  </td>
                  <td className="shrink">
                    <StatusPill status={r.status} />
                  </td>
                  <td className="shrink muted">
                    <span data-tooltip={r.started_at}>{relTime(r.started_at)}</span>
                  </td>
                  <td className="shrink mono fz-12">{fmtDuration(r.duration_ms)}</td>
                  <td className="shrink mono fz-12">{r.attempt}</td>
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
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: 40,
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: 13,
                    }}
                  >
                    No runs match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div
        className="flex gap-2 mt-4"
        style={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}
      >
        <span className="muted fz-12">
          {filtered.length === 0
            ? 'No rows'
            : `Rows ${currentPage * PAGE_SIZE + 1}–${Math.min(
                (currentPage + 1) * PAGE_SIZE,
                filtered.length,
              )} of ${filtered.length}`}
        </span>
        <div className="flex gap-2" style={{ alignItems: 'center' }}>
          {hitLimit && limit < FETCH_MAX && (
            <button
              className="btn sm"
              onClick={() => setLimit((l) => Math.min(l + FETCH_STEP, FETCH_MAX))}
              title="Older runs in the 7-day window exist beyond the current fetch limit"
            >
              Load more
            </button>
          )}
          <button
            className="btn sm"
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
          >
            Prev
          </button>
          <span className="mono fz-12 muted">
            {currentPage + 1} / {pageCount}
          </span>
          <button
            className="btn sm"
            disabled={currentPage >= pageCount - 1}
            onClick={() => setPage(currentPage + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
}
