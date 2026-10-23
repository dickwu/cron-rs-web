'use client';

import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import { useRouter, useSearchParams } from 'next/navigation';
import { Icon } from '@/components/ui/icons';
import { Tag } from '@/components/ui/Tag';
import { useTasks } from '@/hooks/useTasks';
import { swrFetcher } from '@/lib/api';
import { HOOK_TYPES, hookTypeLabels } from '@/lib/hooks';
import type { Hook, TaskSummary } from '@/lib/types';
import { navPush } from '@/lib/navigation';
import { HookFormDrawer } from './HookFormDrawer';
import { HookTable } from './HookTable';

type TypeFilter = 'all' | Hook['hook_type'];

interface Group {
  key: string;
  task: TaskSummary | null;
  hooks: Hook[];
}

export function HooksScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const taskFilter = params.get('task');
  const { tasks } = useTasks();
  const { data: hooks = [], error, isLoading, mutate } = useSWR<Hook[]>('/api/v1/hooks', swrFetcher, {
    refreshInterval: 30000,
  });

  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [drawer, setDrawer] = useState<{ open: boolean; hook: Hook | null; taskId: string | null }>({
    open: false,
    hook: null,
    taskId: null,
  });

  const tasksById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const filterTask = taskFilter ? tasksById.get(taskFilter) ?? null : null;

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const global: Group = { key: 'global', task: null, hooks: [] };
    const byTask = new Map<string, Group>();
    for (const h of hooks) {
      if (typeFilter !== 'all' && h.hook_type !== typeFilter) continue;
      if (taskFilter && h.task_id !== taskFilter) continue;
      const task = h.task_id ? tasksById.get(h.task_id) ?? null : null;
      if (h.task_id && !task) continue;
      if (
        needle &&
        !h.command.toLowerCase().includes(needle) &&
        !(task?.name.toLowerCase().includes(needle) ?? 'all tasks'.includes(needle))
      )
        continue;
      if (!task) {
        global.hooks.push(h);
        continue;
      }
      const g = byTask.get(task.id) ?? { key: task.id, task, hooks: [] };
      g.hooks.push(h);
      byTask.set(task.id, g);
    }
    const list = Array.from(byTask.values()).sort((a, b) => a.task!.name.localeCompare(b.task!.name));
    return global.hooks.length ? [global, ...list] : list;
  }, [hooks, tasksById, q, typeFilter, taskFilter]);

  const counts = useMemo(() => {
    const c: Record<TypeFilter, number> = { all: 0, on_failure: 0, on_success: 0, on_retry_exhausted: 0 };
    for (const h of hooks) {
      if (taskFilter && h.task_id !== taskFilter) continue;
      c.all += 1;
      c[h.hook_type] += 1;
    }
    return c;
  }, [hooks, taskFilter]);

  const globalCount = hooks.filter((h) => !h.task_id).length;
  const openAdd = (taskId: string | null) => setDrawer({ open: true, hook: null, taskId });
  const openEdit = (hook: Hook) => setDrawer({ open: true, hook, taskId: hook.task_id });

  const subtitle = filterTask
    ? `Hooks for ${filterTask.name}. Global hooks also run for this task.`
    : `${hooks.length} hook${hooks.length === 1 ? '' : 's'}, ${globalCount} of them global. Hooks run a command after a task succeeds or fails.`;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Hooks</div>
          <div className="page-subtitle">{subtitle}</div>
        </div>
        <div className="flex gap-2 items-center" style={{ flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Icon.search
              size={13}
              style={{ position: 'absolute', left: 10, top: 9, color: 'var(--text-muted)' }}
            />
            <input
              className="input"
              type="search"
              aria-label="Search hooks by command or task"
              placeholder="Search commands or tasks"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ paddingLeft: 30, width: 260, maxWidth: '100%' }}
            />
          </div>
          <button className="btn primary" onClick={() => openAdd(taskFilter)}>
            <Icon.plus size={12} /> Add hook
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4 items-center" style={{ flexWrap: 'wrap' }}>
        {(['all', ...HOOK_TYPES] as TypeFilter[]).map((k) => (
          <Tag key={k} active={typeFilter === k} subtle={typeFilter !== k} onClick={() => setTypeFilter(k)}>
            {k === 'all' ? 'All' : hookTypeLabels[k].label}{' '}
            <span className="mono" style={{ marginLeft: 4, color: 'var(--text-faint)' }}>
              {counts[k]}
            </span>
          </Tag>
        ))}
        {taskFilter && (
          <Tag active onClick={() => navPush(router, '/hooks')}>
            Task: {filterTask?.name ?? taskFilter} <Icon.x size={10} style={{ marginLeft: 4 }} />
            <span className="sr-only">Show hooks for every task</span>
          </Tag>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {groups.map((g) => (
          <div key={g.key} className="card">
            <div className="card-head">
              <div>
                {g.task ? (
                  <button
                    className="btn ghost sm"
                    onClick={() => navPush(router, `/tasks?id=${g.task!.id}`)}
                    style={{ padding: 0, height: 'auto', fontSize: 14, fontWeight: 600 }}
                    title="Open task"
                  >
                    {g.task.name}
                  </button>
                ) : (
                  <span style={{ fontSize: 14, fontWeight: 600 }}>All tasks</span>
                )}
                <span className="muted fz-12" style={{ marginLeft: 8 }}>
                  {g.task ? `${g.hooks.length} hook${g.hooks.length === 1 ? '' : 's'}` : 'Global, runs for every task'}
                </span>
              </div>
              <button className="btn sm" onClick={() => openAdd(g.task?.id ?? null)}>
                <Icon.plus size={11} /> Add hook
              </button>
            </div>
            <div className="card-body flush">
              <HookTable hooks={g.hooks} onEdit={openEdit} />
            </div>
          </div>
        ))}

        {groups.length === 0 && (
          <div className="card">
            <div className="empty-cell" style={{ padding: 40 }}>
              {error ? (
                <>
                  <div>Couldn&apos;t load hooks: {error instanceof Error ? error.message : 'request failed'}.</div>
                  <button className="btn sm mt-4" onClick={() => mutate()}>
                    Try again
                  </button>
                </>
              ) : isLoading ? (
                'Loading hooks…'
              ) : counts.all === 0 ? (
                <>
                  <div>
                    No hooks yet. Add one to send an alert or clean up after a task
                    {filterTask ? ` like ${filterTask.name}` : ''} succeeds or fails.
                  </div>
                  <button className="btn primary sm mt-4" onClick={() => openAdd(taskFilter)}>
                    <Icon.plus size={11} /> Add hook
                  </button>
                </>
              ) : (
                <>
                  <div>No hooks match this search and filter.</div>
                  <button
                    className="btn sm mt-4"
                    onClick={() => {
                      setQ('');
                      setTypeFilter('all');
                    }}
                  >
                    Clear search and filter
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <HookFormDrawer
        open={drawer.open}
        hook={drawer.hook}
        taskId={drawer.taskId}
        tasks={tasks}
        onClose={() => setDrawer((d) => ({ ...d, open: false }))}
      />
    </>
  );
}
