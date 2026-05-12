'use client';

import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/icons';
import { Tag } from '@/components/ui/Tag';
import { useTasks } from '@/hooks/useTasks';
import { swrFetcher } from '@/lib/api';
import { hookTypeLabels } from '@/lib/hooks';
import type { Hook } from '@/lib/types';

const TYPE_FILTERS: Array<{ k: string; label: string }> = [
  { k: 'all', label: 'All' },
  { k: 'on_failure', label: 'On failure' },
  { k: 'on_success', label: 'On success' },
  { k: 'on_retry_exhausted', label: 'On retries exhausted' },
];

export function HooksScreen() {
  const router = useRouter();
  const { tasks } = useTasks();
  const { data: hooks = [] } = useSWR<Hook[]>('/api/v1/hooks', swrFetcher, {
    refreshInterval: 15000,
  });

  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const tasksById = useMemo(() => Object.fromEntries(tasks.map((t) => [t.id, t])), [tasks]);

  const byTask = useMemo(() => {
    const m = new Map<string, { task: typeof tasks[number]; hooks: Hook[] }>();
    hooks.forEach((h) => {
      if (!h.task_id) return;
      const t = tasksById[h.task_id];
      if (!t) return;
      if (
        q &&
        !t.name.toLowerCase().includes(q.toLowerCase()) &&
        !h.command.toLowerCase().includes(q.toLowerCase())
      )
        return;
      if (typeFilter !== 'all' && h.hook_type !== typeFilter) return;
      const cur = m.get(t.id) || { task: t, hooks: [] };
      cur.hooks.push(h);
      m.set(t.id, cur);
    });
    return Array.from(m.values()).sort((a, b) => a.task.name.localeCompare(b.task.name));
  }, [hooks, tasksById, q, typeFilter]);

  const counts = useMemo(
    () => ({
      all: hooks.length,
      on_failure: hooks.filter((h) => h.hook_type === 'on_failure').length,
      on_success: hooks.filter((h) => h.hook_type === 'on_success').length,
      on_retry_exhausted: hooks.filter((h) => h.hook_type === 'on_retry_exhausted').length,
    }),
    [hooks],
  );

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Hooks</div>
          <div className="page-subtitle">
            {hooks.length} hook{hooks.length === 1 ? '' : 's'} across {byTask.length} task
            {byTask.length === 1 ? '' : 's'} · catalog view, edit hooks from each task
          </div>
        </div>
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
            placeholder="Search hooks…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ paddingLeft: 30, width: 280 }}
          />
        </div>
      </div>

      <div className="flex gap-2 mb-4" style={{ flexWrap: 'wrap' }}>
        {TYPE_FILTERS.map((opt) => (
          <Tag
            key={opt.k}
            active={typeFilter === opt.k}
            subtle={typeFilter !== opt.k}
            onClick={() => setTypeFilter(opt.k)}
          >
            {opt.label}{' '}
            <span className="mono" style={{ marginLeft: 4, color: 'var(--text-faint)' }}>
              {counts[opt.k as keyof typeof counts]}
            </span>
          </Tag>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {byTask.map(({ task, hooks: list }) => (
          <div key={task.id} className="card">
            <div className="card-head">
              <div>
                <button
                  className="btn ghost sm"
                  onClick={() => router.push(`/tasks?id=${task.id}`)}
                  style={{ padding: 0, height: 'auto', fontSize: 14, fontWeight: 600 }}
                >
                  {task.name}
                </button>
                <span className="muted mono fz-11" style={{ marginLeft: 8 }}>
                  {task.id}
                </span>
              </div>
              <div className="flex gap-2 items-center">
                <span className="muted fz-12">
                  {list.length} hook{list.length === 1 ? '' : 's'}
                </span>
                <button
                  className="btn sm"
                  onClick={() => router.push(`/tasks?id=${task.id}`)}
                >
                  <Icon.edit size={11} /> Edit
                </button>
              </div>
            </div>
            <div className="card-body flush">
              <table className="t-table">
                <tbody>
                  {list.map((h) => {
                    const def = hookTypeLabels[h.hook_type];
                    return (
                      <tr
                        key={h.id}
                        onClick={() => router.push(`/tasks?id=${task.id}`)}
                      >
                        <td className="shrink" style={{ paddingLeft: 18 }}>
                          <span className="hook-bracket" />
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
                        <td className="shrink mono fz-12 muted">
                          {h.timeout_secs ?? '—'}s
                        </td>
                        <td className="shrink mono fz-12 muted">
                          order {h.run_order}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {byTask.length === 0 && (
          <div className="card">
            <div
              className="card-body"
              style={{
                padding: 40,
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: 13,
              }}
            >
              {hooks.length === 0
                ? 'No hooks configured.'
                : 'No hooks match the current filter.'}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
