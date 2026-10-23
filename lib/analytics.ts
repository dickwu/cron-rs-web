import type { JobRunStatus } from './types';
import { dayjs, parseDate } from './date';

function aggKey(status: JobRunStatus): 'success' | 'failed' | 'running' | 'skipped' {
  if (status === 'retrying' || status === 'timeout' || status === 'crashed') return 'failed';
  if (status === 'success') return 'success';
  if (status === 'failed') return 'failed';
  if (status === 'running') return 'running';
  return 'skipped';
}

export interface PulseBucket {
  success: number;
  failed: number;
  running: number;
  skipped: number;
}

/** 60 buckets, 1 minute each, oldest first. */
export function buildPulse(runs: { started_at: string; status: JobRunStatus }[]): PulseBucket[] {
  const buckets: PulseBucket[] = Array.from({ length: 60 }, () => ({
    success: 0,
    failed: 0,
    running: 0,
    skipped: 0,
  }));
  const now = dayjs();
  for (const r of runs) {
    const at = parseDate(r.started_at);
    if (!at) continue;
    const m = Math.floor(now.diff(at, 'minute'));
    if (m < 0 || m >= 60) continue;
    buckets[m][aggKey(r.status)] += 1;
  }
  return buckets.reverse();
}

export { nextRunAt, nextRuns } from './calendar';
export { relTime, relTimeFuture, fmtDuration } from './date';
