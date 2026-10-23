'use client';

import React, { useEffect, useState } from 'react';
import { useSWRConfig } from 'swr';
import { Drawer } from '@/components/ui/Drawer';
import { Icon } from '@/components/ui/icons';
import { toast } from '@/components/ui/Toaster';
import { createGlobalHook, createHook, deleteHook, updateHook } from '@/lib/api';
import { HOOK_TYPES, hookTypeLabels, isHookCacheKey } from '@/lib/hooks';
import type { Hook, HookType, TaskSummary } from '@/lib/types';

/** Scope value for hooks that apply to every task. */
export const GLOBAL_SCOPE = '';

interface FormState {
  scope: string;
  hook_type: HookType;
  command: string;
  timeout_secs: string;
  run_order: string;
}

function initialState(hook: Hook | null | undefined, taskId: string | null | undefined): FormState {
  if (hook) {
    return {
      scope: hook.task_id ?? GLOBAL_SCOPE,
      hook_type: hook.hook_type,
      command: hook.command,
      timeout_secs: hook.timeout_secs == null ? '' : String(hook.timeout_secs),
      run_order: String(hook.run_order),
    };
  }
  return {
    scope: taskId ?? GLOBAL_SCOPE,
    hook_type: 'on_failure',
    command: '',
    timeout_secs: '',
    run_order: '0',
  };
}

/**
 * Create, edit or delete a hook. `hook` set means edit. When creating, `taskId`
 * preselects the task; `tasks` (if given) lets the user pick a task or "All tasks".
 * The scope of an existing hook can't change because the API has no field for it.
 */
export function HookFormDrawer({
  open,
  onClose,
  hook,
  taskId,
  tasks,
  taskName,
}: {
  open: boolean;
  onClose: () => void;
  hook?: Hook | null;
  taskId?: string | null;
  tasks?: TaskSummary[];
  /** Display name for `taskId` when no task list is passed. */
  taskName?: string;
}) {
  const { mutate } = useSWRConfig();
  const [state, setState] = useState<FormState>(() => initialState(hook, taskId));
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!hook;

  useEffect(() => {
    if (!open) return;
    setState(initialState(hook, taskId));
    setConfirmDelete(false);
    setError(null);
  }, [open, hook, taskId]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setState((s) => ({ ...s, [k]: v }));
    setError(null);
  };

  const refresh = () => mutate(isHookCacheKey);

  const scopeName = (scope: string) =>
    scope === GLOBAL_SCOPE ? 'all tasks' : tasks?.find((t) => t.id === scope)?.name ?? taskName ?? 'this task';

  const save = async () => {
    const command = state.command.trim();
    if (!command) {
      setError('Enter the command the hook should run.');
      return;
    }
    const timeoutRaw = state.timeout_secs.trim();
    const timeout = timeoutRaw === '' ? null : Number(timeoutRaw);
    if (timeout !== null && (!Number.isInteger(timeout) || timeout <= 0)) {
      setError('Timeout must be a whole number of seconds above 0. Leave it empty for no timeout.');
      return;
    }
    const order = Number(state.run_order.trim() || '0');
    if (!Number.isInteger(order)) {
      setError('Order must be a whole number. Hooks with lower numbers run first.');
      return;
    }
    setBusy('save');
    try {
      if (isEdit && hook) {
        await updateHook(hook.id, {
          hook_type: state.hook_type,
          command,
          timeout_secs: timeout,
          run_order: order,
        });
      } else if (state.scope === GLOBAL_SCOPE) {
        await createGlobalHook({ hook_type: state.hook_type, command, timeout_secs: timeout, run_order: order });
      } else {
        await createHook({
          task_id: state.scope,
          hook_type: state.hook_type,
          command,
          timeout_secs: timeout,
          run_order: order,
        });
      }
      toast(isEdit ? 'Hook saved' : `Hook added to ${scopeName(state.scope)}`, 'success');
      await refresh();
      onClose();
    } catch (err) {
      setError(
        `Couldn't save the hook: ${err instanceof Error ? err.message : 'the daemon rejected the request'}. Check the fields and try again.`,
      );
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!hook) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy('delete');
    try {
      await deleteHook(hook.id);
      toast('Hook deleted', 'success');
      await refresh();
      onClose();
    } catch (err) {
      setError(
        `Couldn't delete the hook: ${err instanceof Error ? err.message : 'request failed'}. Try again.`,
      );
      setConfirmDelete(false);
    } finally {
      setBusy(null);
    }
  };

  const scopeLocked = isEdit || !tasks;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={520}
      title={isEdit ? 'Edit hook' : 'Add hook'}
      footer={
        <>
          {isEdit && (
            <button
              className="btn danger"
              style={{ marginRight: 'auto' }}
              onClick={remove}
              disabled={!!busy}
            >
              {busy === 'delete' ? <Icon.spinner size={13} /> : <Icon.trash size={12} />}
              {confirmDelete ? 'Confirm delete' : 'Delete hook'}
            </button>
          )}
          <button className="btn" onClick={onClose} disabled={!!busy}>
            Cancel
          </button>
          <button className="btn primary" onClick={save} disabled={!!busy}>
            {busy === 'save' ? <Icon.spinner size={13} /> : null}
            {isEdit ? 'Save hook' : 'Add hook'}
          </button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <label className="field">
          <div className="label-row">
            <span className="label">Applies to</span>
            {scopeLocked && isEdit && <span className="hint">can&apos;t be changed after creation</span>}
          </div>
          {scopeLocked ? (
            <div className="input mono" aria-readonly="true" style={{ color: 'var(--text-secondary)' }}>
              {state.scope === GLOBAL_SCOPE ? 'All tasks' : scopeName(state.scope)}
            </div>
          ) : (
            <select className="select" value={state.scope} onChange={(e) => set('scope', e.target.value)}>
              <option value={GLOBAL_SCOPE}>All tasks</option>
              {tasks!.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
          {state.scope === GLOBAL_SCOPE && (
            <div className="help">Global hooks run for every task, after that task&apos;s own hooks.</div>
          )}
        </label>

        <fieldset className="field hook-types">
          <legend className="label">When it runs</legend>
          {HOOK_TYPES.map((t) => {
            const def = hookTypeLabels[t];
            return (
              <label key={t} className={`hook-type${state.hook_type === t ? ' on' : ''}`}>
                <input
                  type="radio"
                  name="hook_type"
                  value={t}
                  checked={state.hook_type === t}
                  onChange={() => set('hook_type', t)}
                />
                <span className="dot" style={{ background: `var(--c-${def.color})` }} />
                <span>
                  <span className="t">{def.label}</span>
                  <span className="d">{def.when}</span>
                </span>
              </label>
            );
          })}
        </fieldset>

        <label className="field">
          <div className="label-row">
            <span className="label">Command</span>
            <span className="hint">run with sh -c</span>
          </div>
          <textarea
            className="textarea mono"
            rows={3}
            value={state.command}
            onChange={(e) => set('command', e.target.value)}
            placeholder="curl -fsS -X POST https://hooks.example.com/cron-failed"
            autoFocus
          />
        </label>

        <div className="hook-row">
          <label className="field">
            <div className="label-row">
              <span className="label">Timeout</span>
              <span className="hint">seconds</span>
            </div>
            <input
              className="input mono"
              inputMode="numeric"
              value={state.timeout_secs}
              onChange={(e) => set('timeout_secs', e.target.value)}
              placeholder="None"
            />
            <div className="help">Leave empty for no timeout.</div>
          </label>
          <label className="field">
            <div className="label-row">
              <span className="label">Order</span>
            </div>
            <input
              className="input mono"
              inputMode="numeric"
              value={state.run_order}
              onChange={(e) => set('run_order', e.target.value)}
            />
            <div className="help">Lower numbers run first.</div>
          </label>
        </div>

        {confirmDelete && (
          <div className="form-notice warn" role="alert">
            Deleting removes this hook for {scopeName(state.scope)}. Past hook runs stay in run history. Select
            Confirm delete to continue.
          </div>
        )}
        {error && (
          <div className="form-notice error" role="alert">
            {error}
          </div>
        )}
        <button type="submit" hidden />
      </form>
    </Drawer>
  );
}
