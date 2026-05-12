'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useRunSummaries } from '@/hooks/useRuns';
import { useTasks } from '@/hooks/useTasks';
import { topTasks } from '@/lib/analytics';

export function TopTasksCard() {
  const router = useRouter();
  const since = useMemo(() => new Date(Date.now() - 86400 * 1000).toISOString(), []);
  const { runs } = useRunSummaries({ since });
  const { tasks } = useTasks();
  const tasksById = useMemo(() => Object.fromEntries(tasks.map((t) => [t.id, t])), [tasks]);

  const enriched = useMemo(
    () =>
      runs.map((r) => ({
        ...r,
        task_name: tasksById[r.task_id]?.name || r.task_id,
      })),
    [runs, tasksById],
  );

  const data = useMemo(() => topTasks(enriched, 6), [enriched]);

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title">Top tasks · 24h</div>
          <div className="card-sub">Most active timers in this window</div>
        </div>
      </div>
      <div className="card-body" style={{ padding: '8px 0' }}>
        {data.length === 0 && (
          <div
            style={{
              padding: 24,
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 13,
            }}
          >
            No activity in the past 24 hours.
          </div>
        )}
        {data.map((t) => (
          <button
            key={t.task_id}
            className="flex items-center between gap-3"
            onClick={() => router.push(`/tasks?id=${t.task_id}`)}
            style={{
              width: '100%',
              padding: '10px 18px',
              borderRadius: 0,
              fontSize: 13,
              background: 'transparent',
            }}
          >
            <div className="truncate" style={{ flex: 1, textAlign: 'left' }}>
              <div className="fw-500">{t.task_name}</div>
              <div className="mono fz-11 muted">{t.task_id}</div>
            </div>
            <div
              style={{
                width: 120,
                display: 'flex',
                height: 5,
                borderRadius: 3,
                overflow: 'hidden',
                background: 'var(--border-subtle)',
              }}
            >
              {t.success > 0 && (
                <div
                  style={{ flex: t.success, background: 'var(--c-success)' }}
                  data-tooltip={`${t.success} success`}
                />
              )}
              {t.failed > 0 && (
                <div
                  style={{ flex: t.failed, background: 'var(--c-error)' }}
                  data-tooltip={`${t.failed} failed`}
                />
              )}
              {t.running > 0 && (
                <div
                  style={{ flex: t.running, background: 'var(--c-running)' }}
                  data-tooltip={`${t.running} running`}
                />
              )}
              {t.skipped > 0 && (
                <div
                  style={{ flex: t.skipped, background: 'var(--c-neutral)' }}
                  data-tooltip={`${t.skipped} skipped`}
                />
              )}
            </div>
            <div
              className="mono fz-12"
              style={{ width: 60, textAlign: 'right', color: 'var(--text-muted)' }}
            >
              {t.total} runs
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
