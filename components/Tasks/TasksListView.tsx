'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/icons';
import { StatusPill } from '@/components/ui/StatusPill';
import { Tag } from '@/components/ui/Tag';
import { Sparkline } from '@/components/ui/Sparkline';
import { toast } from '@/components/ui/Toaster';
import { useTasks } from '@/hooks/useTasks';
import { useRunSummaries } from '@/hooks/useRuns';
import { describeSchedule } from '@/lib/schedule';
import { nextRunAt } from '@/lib/analytics';
import { relTimeFuture } from '@/lib/date';
import { triggerTask, enableTask, disableTask, deleteTask } from '@/lib/api';
import { usePrefs } from '@/stores/prefsStore';
import { useSWRConfig } from 'swr';
import type { TaskSummary } from '@/lib/types';
import { dayjs, parseDate } from '@/lib/date';

export function TasksListView() {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { tasks } = useTasks();
  const since = useMemo(() => new Date(Date.now() - 14 * 86400 * 1000).toISOString(), []);
  const { runs } = useRunSummaries({ since });
  const showSchedule = usePrefs((s) => s.showSchedule);
  const showCommand = usePrefs((s) => s.showCommand);
  const showTags = usePrefs((s) => s.showTags);

  const [q, setQ] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allTags = useMemo(
    () => Array.from(new Set(tasks.flatMap((t) => t.tags || []))).sort(),
    [tasks],
  );

  const visible = useMemo(
    () =>
      tasks.filter((t) => {
        if (tagFilter && !(t.tags || []).includes(tagFilter)) return false;
        if (!q) return true;
        const s = q.toLowerCase();
        return (
          t.name.toLowerCase().includes(s) ||
          (t.tags || []).some((tag) => tag.toLowerCase().includes(s))
        );
      }),
    [tasks, tagFilter, q],
  );

  const sparkOf = (taskId: string) => {
    const days = 14;
    const arr = Array(days).fill(0);
    const now = dayjs();
    runs.forEach((r) => {
      if (r.task_id !== taskId) return;
      const at = parseDate(r.started_at);
      if (!at) return;
      const ago = now.diff(at, 'day');
      if (ago >= 0 && ago < days) arr[days - 1 - ago] += 1;
    });
    return arr;
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const refresh = () =>
    mutate((key) => typeof key === 'string' && key.startsWith('/api/v1/'));

  const handleBulk = async (action: 'enable' | 'disable' | 'delete' | 'trigger') => {
    const ids = Array.from(selected);
    try {
      for (const id of ids) {
        if (action === 'enable') await enableTask(id);
        else if (action === 'disable') await disableTask(id);
        else if (action === 'delete') await deleteTask(id);
        else if (action === 'trigger') await triggerTask(id);
      }
      toast(`${ids.length} task${ids.length === 1 ? '' : 's'} ${action}d`, 'success');
      setSelected(new Set());
      refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      toast(msg, 'error');
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Tasks</div>
          <div className="page-subtitle">
            {visible.length} of {tasks.length} task{tasks.length === 1 ? '' : 's'}
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
              placeholder="Search tasks, tags…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ paddingLeft: 30, width: 280 }}
            />
          </div>
          <button
            className="btn primary"
            onClick={() => router.push('/tasks?new=1')}
          >
            <Icon.plus size={13} /> New task
          </button>
        </div>
      </div>

      {allTags.length > 0 && (
        <div
          className="flex gap-2 items-center mb-4"
          style={{ flexWrap: 'wrap' }}
        >
          <span className="muted fz-12" style={{ marginRight: 4 }}>
            Tags
          </span>
          <Tag
            active={tagFilter === null}
            subtle={tagFilter !== null}
            onClick={() => setTagFilter(null)}
          >
            All
          </Tag>
          {allTags.map((tag) => (
            <Tag
              key={tag}
              active={tagFilter === tag}
              subtle={tagFilter !== tag}
              onClick={() => setTagFilter(tag === tagFilter ? null : tag)}
            >
              {tag}
            </Tag>
          ))}
        </div>
      )}

      {selected.size > 0 && (
        <div
          className="card mb-4"
          style={{ background: 'var(--accent-soft)', borderColor: 'transparent' }}
        >
          <div className="flex items-center gap-3" style={{ padding: '12px 18px' }}>
            <span className="fw-500 fz-13">{selected.size} selected</span>
            <button className="btn sm" onClick={() => handleBulk('trigger')}>
              <Icon.play size={11} /> Trigger
            </button>
            <button className="btn sm" onClick={() => handleBulk('enable')}>
              <Icon.check size={11} /> Enable
            </button>
            <button className="btn sm" onClick={() => handleBulk('disable')}>
              <Icon.pause size={11} /> Disable
            </button>
            <button className="btn sm danger" onClick={() => handleBulk('delete')}>
              <Icon.trash size={11} /> Delete
            </button>
            <button
              className="btn ghost sm"
              onClick={() => setSelected(new Set())}
              style={{ marginLeft: 'auto' }}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body flush">
          <table className="t-table">
            <thead>
              <tr>
                <th className="check">
                  <input
                    type="checkbox"
                    checked={selected.size === visible.length && visible.length > 0}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked ? new Set(visible.map((t) => t.id)) : new Set(),
                      )
                    }
                  />
                </th>
                <th>Name</th>
                {showSchedule && <th>Schedule</th>}
                {showCommand && <th>Command</th>}
                {showTags && <th>Tags</th>}
                <th>Status</th>
                <th>Activity · 14d</th>
                <th>Next run</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  spark={sparkOf(task.id)}
                  selected={selected.has(task.id)}
                  onToggle={() => toggle(task.id)}
                  onOpen={() => router.push(`/tasks?id=${task.id}`)}
                  onTrigger={async () => {
                    try {
                      await triggerTask(task.id);
                      toast(`Triggered ${task.name}`, 'success');
                      refresh();
                    } catch (err) {
                      toast(err instanceof Error ? err.message : 'Trigger failed', 'error');
                    }
                  }}
                  onToggleEnabled={async () => {
                    try {
                      if (task.enabled) await disableTask(task.id);
                      else await enableTask(task.id);
                      refresh();
                    } catch (err) {
                      toast(
                        err instanceof Error ? err.message : 'Update failed',
                        'error',
                      );
                    }
                  }}
                  showSchedule={showSchedule}
                  showCommand={showCommand}
                  showTags={showTags}
                />
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={8 + (showSchedule ? 1 : 0) + (showCommand ? 1 : 0) + (showTags ? 1 : 0)}>
                    <div
                      style={{
                        padding: 40,
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                        fontSize: 13,
                      }}
                    >
                      No tasks match the current filter.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function TaskRow({
  task,
  spark,
  selected,
  onToggle,
  onOpen,
  onTrigger,
  onToggleEnabled,
  showSchedule,
  showCommand,
  showTags,
}: {
  task: TaskSummary;
  spark: number[];
  selected: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onTrigger: () => void;
  onToggleEnabled: () => void;
  showSchedule: boolean;
  showCommand: boolean;
  showTags: boolean;
}) {
  const desc = describeSchedule(task.schedule);
  const next = nextRunAt(task.schedule);
  return (
    <tr onClick={onOpen} className={selected ? 'selected' : ''}>
      <td className="check" onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" checked={selected} onChange={onToggle} />
      </td>
      <td>
        <div className="fw-500">{task.name}</div>
        <div className="mono fz-11 muted">{task.id}</div>
      </td>
      {showSchedule && (
        <td className="shrink">
          <div className="schedule-chip">
            <span className="summary">{desc.summary}</span>
            <span className="expr">{task.schedule}</span>
          </div>
        </td>
      )}
      {showCommand && (
        <td>
          <span
            className="mono fz-12 truncate"
            style={{ display: 'inline-block', maxWidth: 260, verticalAlign: 'middle' }}
          >
            {/* TaskSummary doesn't carry command — show schedule expr placeholder */}
            {task.schedule}
          </span>
        </td>
      )}
      {showTags && (
        <td className="shrink">
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {(task.tags || []).map((tag) => (
              <Tag key={tag} subtle>
                {tag}
              </Tag>
            ))}
          </div>
        </td>
      )}
      <td className="shrink">
        <StatusPill status={task.enabled ? 'enabled' : 'disabled'} />
      </td>
      <td className="shrink">
        <Sparkline
          data={spark}
          width={80}
          height={22}
          stroke="var(--c-running)"
          fill="var(--c-running-soft)"
        />
      </td>
      <td className="shrink muted fz-12">
        {task.enabled && next ? relTimeFuture(next) : '—'}
      </td>
      <td className="actions shrink" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'inline-flex', gap: 2 }}>
          <button
            className="btn ghost icon sm"
            data-tooltip="Trigger now"
            onClick={onTrigger}
          >
            <Icon.play size={12} />
          </button>
          <button
            className="btn ghost icon sm"
            data-tooltip={task.enabled ? 'Disable' : 'Enable'}
            onClick={onToggleEnabled}
          >
            <Icon.pause size={12} />
          </button>
        </div>
      </td>
    </tr>
  );
}
