'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboardActivity } from '@/hooks/useDashboard';
import { navPush } from '@/lib/navigation';

export function TopTasksCard() {
  const router = useRouter();
  const { activity } = useDashboardActivity('24h');

  const data = useMemo(
    () => [...(activity?.top_tasks ?? [])].sort((a, b) => b.total - a.total),
    [activity],
  );

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
            onClick={() => navPush(router, `/tasks?id=${t.task_id}`)}
            style={{
              width: '100%',
              padding: '10px 18px',
              borderRadius: 0,
              fontSize: 13,
              background: 'transparent',
            }}
          >
            <div className="truncate" style={{ flex: 1, textAlign: 'left' }}>
              <div className="fw-500">{t.task_name || t.task_id}</div>
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
              {t.counts.success > 0 && (
                <div
                  style={{ flex: t.counts.success, background: 'var(--c-success)' }}
                  data-tooltip={`${t.counts.success} success`}
                />
              )}
              {t.counts.failed > 0 && (
                <div
                  style={{ flex: t.counts.failed, background: 'var(--c-error)' }}
                  data-tooltip={`${t.counts.failed} failed`}
                />
              )}
              {t.counts.running > 0 && (
                <div
                  style={{ flex: t.counts.running, background: 'var(--c-running)' }}
                  data-tooltip={`${t.counts.running} running`}
                />
              )}
              {t.counts.skipped > 0 && (
                <div
                  style={{ flex: t.counts.skipped, background: 'var(--c-neutral)' }}
                  data-tooltip={`${t.counts.skipped} skipped`}
                />
              )}
            </div>
            <div
              className="mono fz-12"
              style={{ width: 60, textAlign: 'right', color: 'var(--text-muted)' }}
            >
              {t.total.toLocaleString('en-US')} runs
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
