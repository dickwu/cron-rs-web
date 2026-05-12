'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/icons';
import { useTasks } from '@/hooks/useTasks';
import { useRunSummaries } from '@/hooks/useRuns';
import { usePrefs } from '@/stores/prefsStore';
import { relTime } from '@/lib/analytics';
import { triggerTask } from '@/lib/api';
import { toast } from '@/components/ui/Toaster';
import { PRIMARY_NAV, SECONDARY_NAV } from './SideNav';

interface CmdItem {
  group: string;
  icon: (p: { size?: number }) => React.ReactElement;
  label: string;
  meta?: string;
  action: () => void;
}

export function CmdK({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const toggleTheme = usePrefs((s) => s.toggleTheme);
  const { tasks } = useTasks();
  const { runs } = useRunSummaries({ limit: 30 });

  const [q, setQ] = useState('');
  const [focus, setFocus] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ('');
      setFocus(0);
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  const items = useMemo<CmdItem[]>(() => {
    const all: CmdItem[] = [];
    [...PRIMARY_NAV, ...SECONDARY_NAV].forEach((n) =>
      all.push({
        group: 'Navigate',
        icon: n.icon,
        label: 'Go to ' + n.label,
        action: () => router.push(n.href),
      }),
    );
    all.push({
      group: 'Actions',
      icon: Icon.plus,
      label: 'Create new task…',
      meta: 'N',
      action: () => router.push('/tasks?new=1'),
    });
    all.push({
      group: 'Actions',
      icon: Icon.refresh,
      label: 'Refresh dashboard',
      action: () => router.refresh(),
    });
    all.push({
      group: 'Actions',
      icon: Icon.sun,
      label: 'Toggle theme',
      action: toggleTheme,
    });
    tasks.forEach((t) =>
      all.push({
        group: 'Tasks',
        icon: Icon.tasks,
        label: t.name,
        meta: t.id,
        action: () => router.push(`/tasks?id=${t.id}`),
      }),
    );
    tasks
      .filter((t) => t.enabled)
      .forEach((t) =>
        all.push({
          group: 'Trigger',
          icon: Icon.play,
          label: `Trigger ${t.name}`,
          meta: t.id,
          action: async () => {
            try {
              await triggerTask(t.id);
              toast(`Triggered ${t.name}`, 'success');
            } catch (err) {
              toast(err instanceof Error ? err.message : 'Trigger failed', 'error');
            }
          },
        }),
      );
    runs.slice(0, 10).forEach((r) =>
      all.push({
        group: 'Recent runs',
        icon: Icon.runs,
        label: `${r.task_id.slice(0, 12)} · ${r.status}`,
        meta: relTime(r.started_at),
        action: () => router.push(`/runs?id=${r.id}`),
      }),
    );

    const lower = q.trim().toLowerCase();
    if (!lower) return all;
    return all.filter(
      (x) =>
        x.label.toLowerCase().includes(lower) ||
        (x.meta && x.meta.toString().toLowerCase().includes(lower)),
    );
  }, [q, tasks, runs, router, toggleTheme]);

  const grouped = useMemo(() => {
    const out: Record<string, CmdItem[]> = {};
    items.forEach((it) => {
      if (!out[it.group]) out[it.group] = [];
      out[it.group].push(it);
    });
    return out;
  }, [items]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocus((f) => Math.min(items.length - 1, f + 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocus((f) => Math.max(0, f - 1));
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        items[focus]?.action();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, items, focus, onClose]);

  if (!open) return null;

  let runningIndex = -1;
  return (
    <div className="cmdk-backdrop" onClick={onClose}>
      <div className="cmdk" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="cmdk-input"
          placeholder="Search tasks, runs, actions…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setFocus(0);
          }}
        />
        <div className="cmdk-list">
          {Object.entries(grouped).map(([group, list]) => (
            <div key={group}>
              <div className="cmdk-group">{group}</div>
              {list.map((it) => {
                runningIndex += 1;
                const isFocus = runningIndex === focus;
                const ItemIcon = it.icon;
                const myIdx = runningIndex;
                return (
                  <button
                    key={myIdx}
                    className={`cmdk-item ${isFocus ? 'focus' : ''}`}
                    onMouseEnter={() => setFocus(myIdx)}
                    onClick={() => {
                      it.action();
                      onClose();
                    }}
                  >
                    <ItemIcon size={14} />
                    <span>{it.label}</span>
                    {it.meta && <span className="meta">{it.meta}</span>}
                  </button>
                );
              })}
            </div>
          ))}
          {items.length === 0 && (
            <div
              style={{
                padding: 20,
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: 13,
              }}
            >
              No results.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
