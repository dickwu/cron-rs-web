'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { StatusPill } from '@/components/ui/StatusPill';
import { Icon } from '@/components/ui/icons';
import { useRunSummaries } from '@/hooks/useRuns';
import { useTasks } from '@/hooks/useTasks';
import { relTime } from '@/lib/analytics';

export function RecentFailures() {
  const router = useRouter();
  const since = useMemo(() => new Date(Date.now() - 7 * 86400 * 1000).toISOString(), []);
  const { runs } = useRunSummaries({ since });
  const { tasks } = useTasks();
  const tasksById = useMemo(() => Object.fromEntries(tasks.map((t) => [t.id, t])), [tasks]);

  const failed = runs
    .filter(
      (r) =>
        r.status === 'failed' || r.status === 'timeout' || r.status === 'crashed',
    )
    .slice(0, 5);

  if (failed.length === 0) {
    return (
      <div className="card">
        <div className="card-head">
          <div className="card-title">Recent failures</div>
        </div>
        <div
          className="card-body"
          style={{
            textAlign: 'center',
            padding: 32,
            color: 'var(--text-muted)',
            fontSize: 13,
          }}
        >
          <Icon.check size={18} style={{ color: 'var(--c-success)', marginBottom: 6 }} />
          <br />
          All green. No failures in the past 7 days.
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">Recent failures</div>
        <span
          className="tag"
          style={{
            color: 'var(--c-error)',
            background: 'var(--c-error-soft)',
            borderColor: 'transparent',
          }}
        >
          {failed.length} need attention
        </span>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        {failed.map((r) => (
          <button
            key={r.id}
            onClick={() => router.push(`/runs?id=${r.id}`)}
            style={{
              width: '100%',
              display: 'grid',
              gridTemplateColumns: '1fr auto auto auto',
              gap: 12,
              padding: '10px 18px',
              textAlign: 'left',
              fontSize: 13,
              borderBottom: '1px solid var(--border-subtle)',
              alignItems: 'center',
              background: 'transparent',
            }}
          >
            <div className="truncate">
              <div className="fw-500">
                {tasksById[r.task_id]?.name || r.task_id}
              </div>
              <div className="mono fz-11 muted">{r.id}</div>
            </div>
            <StatusPill status={r.status} />
            <span className="muted fz-12">{relTime(r.started_at)}</span>
            <span className="mono fz-12" style={{ color: 'var(--c-error)' }}>
              exit {r.exit_code ?? '—'}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
