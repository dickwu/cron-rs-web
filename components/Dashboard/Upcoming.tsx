'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useTasks } from '@/hooks/useTasks';
import { nextRunAt } from '@/lib/analytics';
import { relTimeFuture, dayjs } from '@/lib/date';

export function Upcoming() {
  const router = useRouter();
  const { tasks } = useTasks();

  const upcoming = tasks
    .filter((t) => t.enabled)
    .map((t) => ({ task: t, at: nextRunAt(t.schedule) }))
    .filter((x): x is { task: typeof x.task; at: Date } => x.at instanceof Date)
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, 6);

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">Upcoming</div>
        <span className="muted fz-12">Next 6 runs</span>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        {upcoming.length === 0 && (
          <div
            style={{
              padding: 24,
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 13,
            }}
          >
            No upcoming runs.
          </div>
        )}
        {upcoming.map(({ task, at }) => (
          <button
            key={task.id}
            className="flex items-center between"
            onClick={() => router.push(`/tasks?id=${task.id}`)}
            style={{
              width: '100%',
              padding: '10px 18px',
              textAlign: 'left',
              fontSize: 13,
              borderBottom: '1px solid var(--border-subtle)',
              gap: 10,
              background: 'transparent',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="fw-500 truncate">{task.name}</div>
              <div className="muted mono fz-11">{task.schedule}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="mono fz-12">{relTimeFuture(at)}</div>
              <div className="muted fz-11">{dayjs(at).format('HH:mm')}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
