'use client';

import React from 'react';
import { Icon } from '@/components/ui/icons';
import { Tag } from '@/components/ui/Tag';
import { hookTypeLabels } from '@/lib/hooks';
import type { Hook } from '@/lib/types';

/** Hook rows; the whole row (or Enter on it) opens the editor. */
export function HookTable({ hooks, onEdit }: { hooks: Hook[]; onEdit: (hook: Hook) => void }) {
  return (
    <table className="t-table hook-table">
      <thead>
        <tr>
          <th>When</th>
          <th>Command</th>
          <th className="col-optional">Timeout</th>
          <th className="col-optional">Order</th>
          <th>
            <span className="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {hooks.map((h) => {
          const def = hookTypeLabels[h.hook_type];
          return (
            <tr
              key={h.id}
              tabIndex={0}
              onClick={() => onEdit(h)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target === e.currentTarget) onEdit(h);
              }}
            >
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
              <td className="mono fz-12" style={{ wordBreak: 'break-all' }}>
                {h.command}
              </td>
              <td className="shrink mono fz-12 muted col-optional">
                {h.timeout_secs == null ? 'None' : `${h.timeout_secs}s`}
              </td>
              <td className="shrink mono fz-12 muted col-optional">{h.run_order}</td>
              <td className="act">
                <button
                  className="btn ghost icon sm"
                  aria-label={`Edit ${def.label.toLowerCase()} hook`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(h);
                  }}
                >
                  <Icon.edit size={12} />
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
