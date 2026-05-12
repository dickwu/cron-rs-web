'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { StatusPill } from '@/components/ui/StatusPill';
import { Icon } from '@/components/ui/icons';
import { useDashboardRecentRuns } from '@/hooks/useDashboard';
import { fmtDuration, relTime } from '@/lib/analytics';

export function RecentRunsCard() {
  const router = useRouter();
  const { runs } = useDashboardRecentRuns(20);

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">Recent runs</div>
        <button
          className="muted fz-12"
          onClick={() => router.push('/runs')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: 'transparent',
          }}
        >
          View all <Icon.chevron size={11} />
        </button>
      </div>
      <div className="card-body flush">
        {runs.length === 0 ? (
          <div
            style={{
              padding: 40,
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 13,
            }}
          >
            No runs yet.
          </div>
        ) : (
          <table className="t-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Status</th>
                <th>Started</th>
                <th>Duration</th>
                <th style={{ textAlign: 'right' }}>Exit</th>
              </tr>
            </thead>
            <tbody>
              {runs.slice(0, 10).map((r) => (
                <tr key={r.id} onClick={() => router.push(`/runs?id=${r.id}`)}>
                  <td>
                    <div className="fw-500">{r.task_name || r.task_id}</div>
                    <div
                      className="mono fz-11 muted truncate"
                      style={{ maxWidth: 220 }}
                    >
                      {r.id}
                    </div>
                  </td>
                  <td className="shrink">
                    <StatusPill status={r.status} />
                  </td>
                  <td className="shrink muted">{relTime(r.started_at)}</td>
                  <td className="shrink mono fz-12">{fmtDuration(r.duration_ms)}</td>
                  <td
                    className="shrink mono fz-12"
                    style={{
                      textAlign: 'right',
                      color:
                        r.exit_code === 0
                          ? 'var(--text-secondary)'
                          : r.exit_code != null
                          ? 'var(--c-error)'
                          : 'var(--text-faint)',
                    }}
                  >
                    {r.exit_code != null ? r.exit_code : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
