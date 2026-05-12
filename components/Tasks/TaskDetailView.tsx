'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/icons';
import { StatusPill } from '@/components/ui/StatusPill';
import { Tag } from '@/components/ui/Tag';
import { CronTimeline, vizForSchedule } from '@/components/ui/CronTimeline';
import { toast } from '@/components/ui/Toaster';
import { TaskFormDrawer } from './TaskFormDrawer';
import { useTaskDetail } from '@/hooks/useTasks';
import { describeSchedule } from '@/lib/schedule';
import { nextRunAt } from '@/lib/analytics';
import { relTime, relTimeFuture, fmtDuration, fmtDateTimeLong, dayjs } from '@/lib/date';
import { triggerTask, deleteTask } from '@/lib/api';
import { hookTypeLabels } from '@/lib/hooks';
import { useSWRConfig } from 'swr';

type TabKey = 'overview' | 'runs' | 'hooks' | 'schedule';

export function TaskDetailView({ taskId }: { taskId: string }) {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { detail } = useTaskDetail(taskId);
  const [tab, setTab] = useState<TabKey>('overview');
  const [editOpen, setEditOpen] = useState(false);

  const task = detail?.task;
  const runs = detail?.runs || [];
  const hooks = detail?.hooks || [];

  const success = runs.filter((r) => r.status === 'success').length;
  const failed = runs.filter(
    (r) => r.status === 'failed' || r.status === 'timeout' || r.status === 'crashed',
  ).length;
  const successRate = success + failed ? (success / (success + failed)) * 100 : null;

  const cronViz = useMemo(() => vizForSchedule(task?.schedule || ''), [task?.schedule]);
  const next = task ? nextRunAt(task.schedule) : null;

  if (!task) {
    return (
      <div
        style={{
          padding: 60,
          textAlign: 'center',
          color: 'var(--text-muted)',
        }}
      >
        <Icon.spinner size={20} />
      </div>
    );
  }

  const onTrigger = async () => {
    try {
      await triggerTask(task.id);
      toast(`Triggered ${task.name}`, 'success');
      mutate((key) => typeof key === 'string' && key.startsWith('/api/v1/'));
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Trigger failed', 'error');
    }
  };

  const onDelete = async () => {
    if (!confirm(`Delete task "${task.name}"? This cannot be undone.`)) return;
    try {
      await deleteTask(task.id);
      toast(`Deleted ${task.name}`, 'success');
      mutate((key) => typeof key === 'string' && key.startsWith('/api/v1/'));
      router.push('/tasks');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Delete failed', 'error');
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
            <button className="btn ghost sm" onClick={() => router.push('/tasks')}>
              <Icon.chevron size={12} style={{ transform: 'rotate(180deg)' }} /> Tasks
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="page-title">{task.name}</span>
            <StatusPill status={task.enabled ? 'enabled' : 'disabled'} />
            {(task.tags || []).map((tag) => (
              <Tag key={tag} subtle>
                {tag}
              </Tag>
            ))}
          </div>
          <div className="page-subtitle mono">{task.id}</div>
        </div>
        <div className="flex gap-2">
          <button className="btn" onClick={onTrigger}>
            <Icon.play size={13} /> Trigger now
          </button>
          <button className="btn" onClick={() => setEditOpen(true)}>
            <Icon.edit size={13} /> Edit
          </button>
          <button className="btn danger" onClick={onDelete}>
            <Icon.trash size={13} /> Delete
          </button>
        </div>
      </div>

      <div className="stats-row mb-4">
        <div className="stat-card">
          <div className="stat-label">Schedule</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>
            {describeSchedule(task.schedule).summary}
          </div>
          <div className="mono fz-11 muted">{task.schedule}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Next run</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>
            {task.enabled && next ? relTimeFuture(next) : 'Disabled'}
          </div>
          <div className="mono fz-11 muted">
            {task.enabled && next ? fmtDateTimeLong(next) : '—'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Success rate · 30d</div>
          <div className="stat-value mono">
            {successRate !== null ? successRate.toFixed(1) : '—'}
            <span className="unit">%</span>
          </div>
          <div className="stat-delta">
            <span className="up">{success}</span> success ·{' '}
            <span className="down">{failed}</span> failed
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Last run</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>
            {runs[0] ? (
              <StatusPill status={runs[0].status} />
            ) : (
              <span className="muted">No runs yet</span>
            )}
          </div>
          <div className="mono fz-11 muted">
            {runs[0] ? relTime(runs[0].started_at) : '—'}
          </div>
        </div>
      </div>

      <div className="tabs">
        {(
          [
            ['overview', 'Overview', null],
            ['runs', 'Run history', runs.length],
            ['hooks', 'Hooks', hooks.length],
            ['schedule', 'Schedule', null],
          ] as Array<[TabKey, string, number | null]>
        ).map(([k, l, c]) => (
          <button
            key={k}
            className={`tab ${tab === k ? 'active' : ''}`}
            onClick={() => setTab(k)}
          >
            {l}
            {c != null && <span className="count">{c}</span>}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-head">
              <div className="card-title">Definition</div>
            </div>
            <div className="card-body">
              <dl className="dl">
                <dt>Command</dt>
                <dd className="mono" style={{ wordBreak: 'break-all' }}>
                  {task.command}
                </dd>
                <dt>Schedule</dt>
                <dd className="mono">{task.schedule}</dd>
                <dt>Description</dt>
                <dd>{task.description || <span className="muted">—</span>}</dd>
                <dt>Max retries</dt>
                <dd className="mono">{task.max_retries}</dd>
                <dt>Retry delay</dt>
                <dd className="mono">{task.retry_delay_secs}s</dd>
                <dt>Timeout</dt>
                <dd className="mono">
                  {task.timeout_secs ? task.timeout_secs + 's' : 'none'}
                </dd>
                <dt>Concurrency</dt>
                <dd>
                  <Tag mono>{task.concurrency_policy}</Tag>
                </dd>
                {task.lock_key && (
                  <>
                    <dt>Lock key</dt>
                    <dd className="mono">{task.lock_key}</dd>
                  </>
                )}
                {task.sandbox_profile && (
                  <>
                    <dt>Sandbox</dt>
                    <dd className="mono">{task.sandbox_profile}</dd>
                  </>
                )}
              </dl>
            </div>
          </div>
          <div className="card">
            <div className="card-head">
              <div className="card-title">Schedule timeline</div>
              <span className="muted fz-12">Where this task fires within a day</span>
            </div>
            <div className="card-body">
              <CronTimeline minute={cronViz.minute} hour={cronViz.hour} />
              {next && (
                <div className="mt-4 mono fz-12">
                  <span className="muted">Next 5 runs</span>
                  <div style={{ marginTop: 6, color: 'var(--text-secondary)' }}>
                    {Array.from({ length: 5 }).map((_, i) => {
                      const d = dayjs(next).add(i, 'hour');
                      return (
                        <div
                          key={i}
                          style={{
                            padding: '4px 0',
                            borderBottom: '1px dashed var(--border-subtle)',
                          }}
                        >
                          {d.format('ddd, MMM D · HH:mm')}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'runs' && (
        <div className="card">
          <div className="card-body flush">
            <table className="t-table">
              <thead>
                <tr>
                  <th>Run</th>
                  <th>Status</th>
                  <th>Started</th>
                  <th>Duration</th>
                  <th>Attempt</th>
                  <th className="text-right">Exit</th>
                </tr>
              </thead>
              <tbody>
                {runs.slice(0, 50).map((r) => (
                  <tr key={r.id} onClick={() => router.push(`/runs?id=${r.id}`)}>
                    <td className="mono fz-12">{r.id}</td>
                    <td className="shrink">
                      <StatusPill status={r.status} />
                    </td>
                    <td className="shrink muted">{relTime(r.started_at)}</td>
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
                {runs.length === 0 && (
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
                      No runs yet for this task.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'hooks' && (
        <div className="card">
          <div className="card-head">
            <div className="card-title">Hooks · this task</div>
            <button className="btn sm" onClick={() => router.push(`/hooks?task=${task.id}`)}>
              <Icon.plus size={12} /> Add hook
            </button>
          </div>
          <div className="card-body flush">
            {hooks.length === 0 ? (
              <div
                style={{
                  padding: 40,
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: 13,
                }}
              >
                No hooks configured. Add one to fire on success, failure, or retry
                exhaustion.
              </div>
            ) : (
              <table className="t-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Command</th>
                    <th>Timeout</th>
                    <th>Order</th>
                  </tr>
                </thead>
                <tbody>
                  {hooks.map((h) => {
                    const def = hookTypeLabels[h.hook_type];
                    return (
                      <tr key={h.id}>
                        <td className="shrink">
                          <Tag
                            style={{
                              color: `var(--c-${def.color})`,
                              background: `var(--c-${def.color}-soft)`,
                              borderColor: 'transparent',
                            }}
                          >
                            {def.label}
                          </Tag>
                        </td>
                        <td className="mono fz-12">{h.command}</td>
                        <td className="shrink mono fz-12">
                          {h.timeout_secs ? h.timeout_secs + 's' : 'default'}
                        </td>
                        <td className="shrink mono fz-12">{h.run_order}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 'schedule' && (
        <div className="card">
          <div className="card-head">
            <div className="card-title">Schedule editor</div>
            <button className="btn sm" onClick={() => setEditOpen(true)}>
              <Icon.edit size={12} /> Open editor
            </button>
          </div>
          <div className="card-body">
            <CronTimeline minute={cronViz.minute} hour={cronViz.hour} />
            <div
              className="mono fz-12 mt-4"
              style={{
                padding: 12,
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 6,
              }}
            >
              OnCalendar={task.schedule}
            </div>
          </div>
        </div>
      )}

      <TaskFormDrawer
        open={editOpen}
        task={task}
        onClose={() => setEditOpen(false)}
        onSuccess={() => {
          setEditOpen(false);
          mutate((key) => typeof key === 'string' && key.startsWith('/api/v1/'));
        }}
      />
    </>
  );
}
