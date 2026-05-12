'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/icons';
import { StatusPill } from '@/components/ui/StatusPill';
import { Terminal } from './Terminal';
import { useRun, useHookRuns } from '@/hooks/useRuns';
import { useTask } from '@/hooks/useTasks';
import { fmtDuration, fmtDateTimeLong, relTime } from '@/lib/date';
import { triggerTask } from '@/lib/api';
import { toast } from '@/components/ui/Toaster';
import { useSWRConfig } from 'swr';

export function RunDetailView({ runId }: { runId: string }) {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { run } = useRun(runId);
  const { task } = useTask(run?.task_id || null);
  const { hookRuns } = useHookRuns(runId);

  const handleReRun = async () => {
    if (!run) return;
    try {
      await triggerTask(run.task_id);
      toast(`Re-running ${task?.name || run.task_id}`, 'success');
      mutate((key) => typeof key === 'string' && key.startsWith('/api/v1/runs'));
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Re-run failed', 'error');
    }
  };

  const handleExport = () => {
    if (!run) return;
    const parts = [
      `# run ${run.id}`,
      `# task: ${task?.name || run.task_id} (${run.task_id})`,
      `# status: ${run.status}    exit: ${run.exit_code ?? '—'}    attempt: ${run.attempt}`,
      `# started: ${run.started_at}    finished: ${run.finished_at ?? 'still running'}`,
      `# duration: ${fmtDuration(run.duration_ms)}`,
      '',
      '## stdout',
      run.stdout || '(empty)',
      '',
      '## stderr',
      run.stderr || '(empty)',
      '',
    ];
    const blob = new Blob([parts.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${run.id}.log`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('Log downloaded', 'success');
  };

  if (!run) {
    return (
      <div
        style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}
      >
        <Icon.spinner size={20} />
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
            <button className="btn ghost sm" onClick={() => router.push('/runs')}>
              <Icon.chevron size={12} style={{ transform: 'rotate(180deg)' }} /> Runs
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="page-title">{task?.name || run.task_id}</span>
            <StatusPill status={run.status} />
          </div>
          <div className="page-subtitle mono">{run.id}</div>
        </div>
        <div className="flex gap-2">
          <button
            className="btn"
            onClick={() => router.push(`/tasks?id=${run.task_id}`)}
          >
            <Icon.tasks size={13} /> View task
          </button>
          <button className="btn" onClick={handleReRun}>
            <Icon.refresh size={13} /> Re-run
          </button>
          <button className="btn" onClick={handleExport}>
            <Icon.download size={13} /> Export logs
          </button>
        </div>
      </div>

      <div className="stats-row mb-4">
        <div className="stat-card">
          <div className="stat-label">Status</div>
          <div style={{ marginTop: 4 }}>
            <StatusPill status={run.status} />
          </div>
          <div className="stat-delta mt-2">
            Attempt <span className="mono">{run.attempt}</span> of{' '}
            <span className="mono">{(task?.max_retries || 0) + 1}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Exit code</div>
          <div
            className="stat-value mono"
            style={{
              color:
                run.exit_code === 0
                  ? 'var(--c-success)'
                  : run.exit_code != null
                  ? 'var(--c-error)'
                  : 'var(--text-faint)',
            }}
          >
            {run.exit_code ?? '—'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Duration</div>
          <div className="stat-value mono">{fmtDuration(run.duration_ms)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Started</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{relTime(run.started_at)}</div>
          <div className="mono fz-11 muted">{fmtDateTimeLong(run.started_at)}</div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-body" style={{ padding: 0 }}>
          <dl className="dl" style={{ padding: '16px 18px' }}>
            <dt>Task</dt>
            <dd>
              <button
                className="btn ghost sm"
                style={{ padding: 0, height: 'auto' }}
                onClick={() => router.push(`/tasks?id=${run.task_id}`)}
              >
                {task?.name || run.task_id}
              </button>
              <span className="mono fz-11 muted" style={{ marginLeft: 8 }}>
                {run.task_id}
              </span>
            </dd>
            {task?.command && (
              <>
                <dt>Command</dt>
                <dd className="mono">{task.command}</dd>
              </>
            )}
            {task?.description && (
              <>
                <dt>Description</dt>
                <dd>{task.description}</dd>
              </>
            )}
            <dt>Finished</dt>
            <dd>
              {run.finished_at ? (
                fmtDateTimeLong(run.finished_at)
              ) : (
                <span style={{ color: 'var(--c-running)' }}>Still running…</span>
              )}
            </dd>
          </dl>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center between mb-3">
          <div className="card-title">Output</div>
          <span className="muted fz-12">
            stdout + stderr ·{' '}
            {run.status === 'running' ? 'streaming' : 'captured at finish'}
          </span>
        </div>
        <Terminal run={run} />
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">Hook runs</div>
          <span className="muted fz-12">
            {hookRuns.length} hook{hookRuns.length === 1 ? '' : 's'} fired
          </span>
        </div>
        <div className="card-body flush">
          {hookRuns.length === 0 ? (
            <div
              style={{
                padding: 30,
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: 13,
              }}
            >
              No hooks fired for this run.
            </div>
          ) : (
            <table className="t-table">
              <thead>
                <tr>
                  <th>Hook</th>
                  <th>Status</th>
                  <th>Exit</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {hookRuns.map((h) => {
                  const dur =
                    h.finished_at && h.started_at
                      ? new Date(h.finished_at).getTime() -
                        new Date(h.started_at).getTime()
                      : null;
                  return (
                    <tr key={h.id}>
                      <td className="mono fz-12">{h.hook_id}</td>
                      <td className="shrink">
                        <StatusPill status={h.status} />
                      </td>
                      <td className="shrink mono fz-12">{h.exit_code ?? '—'}</td>
                      <td className="shrink mono fz-12">{fmtDuration(dur)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

