'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useTasks } from '@/hooks/useTasks';
import { nextRunAt } from '@/lib/analytics';
import { relTimeFuture, dayjs } from '@/lib/date';
import { navPush } from '@/lib/navigation';
import { staggerAssignments, applyStaggerSecond } from '@/lib/stagger';

export function Upcoming() {
  const router = useRouter();
  const { tasks } = useTasks();

  // Mirror the daemon's every-minute stagger — computed over all tasks
  // (including disabled, which hold their slot) so predicted seconds match the
  // installed timers — so upcoming runs show their real, distinct fire times
  // instead of all colliding at :00.
  const stagger = staggerAssignments(tasks);

  const upcoming = tasks
    .filter((t) => t.enabled)
    .map((t) => {
      const second = stagger.get(t.id);
      const schedule =
        second === undefined ? t.schedule : applyStaggerSecond(t.schedule, second);
      return { task: t, at: nextRunAt(schedule) };
    })
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
            onClick={() => navPush(router, `/tasks?id=${task.id}`)}
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
              <div className="muted fz-11">{dayjs(at).format('HH:mm:ss')}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
