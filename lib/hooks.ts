import type { Hook } from './types';

export const hookTypeLabels: Record<Hook['hook_type'], { label: string; color: string; when: string }> = {
  on_failure: { label: 'On failure', color: 'error', when: 'Runs after a run fails.' },
  on_success: { label: 'On success', color: 'success', when: 'Runs after a run succeeds.' },
  on_retry_exhausted: {
    label: 'On retries exhausted',
    color: 'warning',
    when: 'Runs once, after the last retry has failed.',
  },
};

export const HOOK_TYPES = Object.keys(hookTypeLabels) as Array<Hook['hook_type']>;

/** Matches every SWR key whose data includes hooks, so a save refreshes all views. */
export function isHookCacheKey(key: unknown): boolean {
  return (
    typeof key === 'string' &&
    (key.startsWith('/api/v1/hooks') || /^\/api\/v1\/tasks\/[^/]+\/(detail|hooks)$/.test(key))
  );
}
