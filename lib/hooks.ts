import type { Hook } from './types';

export const hookTypeLabels: Record<Hook['hook_type'], { label: string; color: string }> = {
  on_failure: { label: 'On Failure', color: 'error' },
  on_success: { label: 'On Success', color: 'success' },
  on_retry_exhausted: { label: 'On Retry Exhausted', color: 'warning' },
};
