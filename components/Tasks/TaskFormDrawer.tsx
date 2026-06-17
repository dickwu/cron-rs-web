'use client';

import React, { useEffect, useState } from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { Tag } from '@/components/ui/Tag';
import { Icon } from '@/components/ui/icons';
import { toast } from '@/components/ui/Toaster';
import { CronBuilder } from './CronBuilder';
import { createTask, updateTask } from '@/lib/api';
import { normalizeScheduleExpression } from '@/lib/schedule';
import { normalizeTags } from '@/lib/tags';
import type { Task, CreateTaskPayload } from '@/lib/types';

interface FormState {
  name: string;
  command: string;
  schedule: string;
  tags: string[];
  description: string;
  max_retries: number;
  retry_delay_secs: number;
  timeout_secs: string;
  concurrency_policy: 'skip' | 'allow' | 'queue';
  lock_key: string;
  sandbox_profile: string;
  enabled: boolean;
}

const EMPTY: FormState = {
  name: '',
  command: '',
  schedule: '*-*-* 02:00:00',
  tags: [],
  description: '',
  max_retries: 0,
  retry_delay_secs: 60,
  timeout_secs: '',
  concurrency_policy: 'skip',
  lock_key: '',
  sandbox_profile: '',
  enabled: true,
};

export function TaskFormDrawer({
  open,
  onClose,
  onSuccess,
  task,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  task?: Task | null;
}) {
  const isEdit = !!task;
  const [state, setState] = useState<FormState>(EMPTY);
  const [tagDraft, setTagDraft] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (task) {
      setState({
        name: task.name,
        command: task.command,
        schedule: task.schedule,
        tags: task.tags || [],
        description: task.description || '',
        max_retries: task.max_retries,
        retry_delay_secs: task.retry_delay_secs,
        timeout_secs: task.timeout_secs == null ? '' : String(task.timeout_secs),
        concurrency_policy: task.concurrency_policy,
        lock_key: task.lock_key || '',
        sandbox_profile: task.sandbox_profile || '',
        enabled: task.enabled,
      });
    } else {
      setState(EMPTY);
    }
    setTagDraft('');
  }, [open, task]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const addTag = () => {
    const t = tagDraft.trim();
    if (t && !state.tags.includes(t)) {
      setField('tags', [...state.tags, t]);
      setTagDraft('');
    }
  };

  const removeTag = (t: string) => setField('tags', state.tags.filter((x) => x !== t));

  const handleSubmit = async () => {
    if (!state.name.trim()) {
      toast('Name is required', 'error');
      return;
    }
    if (!state.command.trim()) {
      toast('Command is required', 'error');
      return;
    }
    if (!state.schedule.trim()) {
      toast('Schedule is required', 'error');
      return;
    }
    setBusy(true);
    try {
      const payload: CreateTaskPayload = {
        name: state.name.trim(),
        command: state.command.trim(),
        schedule: normalizeScheduleExpression(state.schedule.trim()),
        tags: normalizeTags(state.tags),
        description: state.description.trim(),
        max_retries: state.max_retries,
        retry_delay_secs: state.retry_delay_secs,
        timeout_secs: state.timeout_secs ? parseInt(state.timeout_secs, 10) : null,
        concurrency_policy: state.concurrency_policy,
        lock_key: state.lock_key.trim() || null,
        sandbox_profile: state.sandbox_profile.trim() || null,
      };
      if (isEdit && task) {
        await updateTask(task.id, { ...payload, enabled: state.enabled });
        toast(`Updated ${payload.name}`, 'success');
      } else {
        await createTask(payload);
        toast(`Created ${payload.name}`, 'success');
      }
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Operation failed';
      toast(msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit task' : 'New task'}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn primary" onClick={handleSubmit} disabled={busy}>
            {busy ? <Icon.spinner size={13} /> : null}
            {isEdit ? 'Update task' : 'Create task'}
          </button>
        </>
      }
    >
      {isEdit && (
        <label className="field">
          <div className="label-row">
            <span className="label">Status</span>
            <span className="hint">timer {state.enabled ? 'active' : 'stopped'}</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={state.enabled}
            onClick={() => setField('enabled', !state.enabled)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <span
              style={{
                width: 34,
                height: 20,
                borderRadius: 999,
                background: state.enabled ? 'var(--accent)' : 'var(--border-strong)',
                position: 'relative',
                transition: 'background 120ms',
                flex: '0 0 auto',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  left: 2,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: 'var(--accent-fg)',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
                  transform: state.enabled ? 'translateX(14px)' : 'translateX(0)',
                  transition: 'transform 120ms',
                }}
              />
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {state.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </button>
          <div className="help">
            Disabled tasks keep their configuration but their systemd timer is stopped and
            won&apos;t fire until re-enabled.
          </div>
        </label>
      )}

      <label className="field">
        <div className="label-row">
          <span className="label">Name</span>
          <span className="hint">unique identifier</span>
        </div>
        <input
          className="input mono"
          value={state.name}
          onChange={(e) => setField('name', e.target.value)}
          placeholder="backup-database"
        />
      </label>

      <label className="field">
        <div className="label-row">
          <span className="label">Command</span>
        </div>
        <textarea
          className="textarea"
          value={state.command}
          onChange={(e) => setField('command', e.target.value)}
          placeholder="/usr/local/bin/backup.sh"
          rows={2}
        />
      </label>

      <label className="field">
        <div className="label-row">
          <span className="label">Schedule</span>
          <span className="hint">OnCalendar</span>
        </div>
      </label>
      <CronBuilder value={state.schedule} onChange={(v) => setField('schedule', v)} />

      <div className="div" />

      <label className="field">
        <div className="label-row">
          <span className="label">Description</span>
          <span className="hint">optional</span>
        </div>
        <textarea
          className="textarea"
          value={state.description}
          onChange={(e) => setField('description', e.target.value)}
          placeholder="Why this task exists, who owns it"
          rows={2}
          style={{ fontFamily: 'var(--font-sans)' }}
        />
      </label>

      <label className="field">
        <div className="label-row">
          <span className="label">Tags</span>
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
          {state.tags.map((t) => (
            <Tag key={t}>
              {t}
              <button
                style={{
                  marginLeft: 2,
                  color: 'inherit',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                }}
                onClick={() => removeTag(t)}
                aria-label={`Remove ${t}`}
              >
                <Icon.x size={9} />
              </button>
            </Tag>
          ))}
        </div>
        <input
          className="input"
          value={tagDraft}
          onChange={(e) => setTagDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder="Press Enter to add"
        />
      </label>

      <div className="div" />

      <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <label className="field">
          <div className="label-row">
            <span className="label">Max retries</span>
          </div>
          <input
            className="input mono"
            type="number"
            min={0}
            max={10}
            value={state.max_retries}
            onChange={(e) => setField('max_retries', parseInt(e.target.value, 10) || 0)}
          />
        </label>
        <label className="field">
          <div className="label-row">
            <span className="label">Retry delay (s)</span>
          </div>
          <input
            className="input mono"
            type="number"
            min={0}
            value={state.retry_delay_secs}
            onChange={(e) => setField('retry_delay_secs', parseInt(e.target.value, 10) || 0)}
          />
        </label>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <label className="field">
          <div className="label-row">
            <span className="label">Timeout (s)</span>
          </div>
          <input
            className="input mono"
            type="number"
            min={0}
            value={state.timeout_secs}
            onChange={(e) => setField('timeout_secs', e.target.value)}
            placeholder="none"
          />
        </label>
        <label className="field">
          <div className="label-row">
            <span className="label">Concurrency</span>
          </div>
          <select
            className="input"
            value={state.concurrency_policy}
            onChange={(e) =>
              setField('concurrency_policy', e.target.value as FormState['concurrency_policy'])
            }
          >
            <option value="skip">Skip</option>
            <option value="allow">Allow</option>
            <option value="queue">Queue</option>
          </select>
          <div className="help">How to behave when this task is already running</div>
        </label>
      </div>

      <label className="field">
        <div className="label-row">
          <span className="label">Lock key</span>
          <span className="hint">optional flock</span>
        </div>
        <input
          className="input mono"
          value={state.lock_key}
          onChange={(e) => setField('lock_key', e.target.value)}
          placeholder="staff-api-boot"
        />
        <div className="help">
          Tasks with the same key share <code>/run/cron-rs/locks/&lt;key&gt;.lock</code> to
          avoid overlapping boot phases.
        </div>
      </label>

      <label className="field">
        <div className="label-row">
          <span className="label">Sandbox profile</span>
          <span className="hint">optional</span>
        </div>
        <select
          className="input"
          value={state.sandbox_profile}
          onChange={(e) => setField('sandbox_profile', e.target.value)}
        >
          <option value="">No sandbox</option>
          <option value="staff-api-hyperf">staff-api-hyperf</option>
        </select>
      </label>
    </Drawer>
  );
}
