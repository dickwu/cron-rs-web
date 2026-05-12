import type { JobRunSummary, JobRunStatus } from './types';
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

export interface ChartBucket {
  label: string;
  bucketStart: Date;
  success: number;
  failed: number;
  skipped: number;
  running: number;
}

export function buildBuckets(
  runs: { started_at: string; status: JobRunStatus }[],
  range: '24h' | '7d' | '30d',
): ChartBucket[] {
  const count = range === '24h' ? 24 : range === '7d' ? 14 : 30;
  const bucketUnit: dayjs.ManipulateType =
    range === '24h' ? 'hour' : range === '7d' ? 'hour' : 'day';
  const bucketLen = range === '24h' ? 1 : range === '7d' ? 12 : 1;
  const now = dayjs();
  const arr: ChartBucket[] = Array.from({ length: count }, (_, i) => {
    const bucketStart = now.subtract((count - 1 - i) * bucketLen, bucketUnit);
    const label =
      range === '24h'
        ? bucketStart.format('HH:00')
        : range === '7d'
        ? bucketStart.format('MMM D HH:00')
        : bucketStart.format('MMM D');
    return {
      label,
      bucketStart: bucketStart.toDate(),
      success: 0,
      failed: 0,
      skipped: 0,
      running: 0,
    };
  });
  for (const r of runs) {
    const at = parseDate(r.started_at);
    if (!at) continue;
    const offset = now.diff(at, bucketUnit);
    const idx = count - 1 - Math.floor(offset / bucketLen);
    if (idx < 0 || idx >= count) continue;
    arr[idx][aggKey(r.status)] += 1;
  }
  return arr;
}

export interface HeatmapDay {
  total: number;
  failed: number;
}

export function buildHeatmap(
  runs: { started_at: string; status: JobRunStatus }[],
): HeatmapDay[] {
  const days = 365;
  const arr: HeatmapDay[] = Array.from({ length: days }, () => ({ total: 0, failed: 0 }));
  const now = dayjs();
  for (const r of runs) {
    const at = parseDate(r.started_at);
    if (!at) continue;
    const ago = now.diff(at, 'day');
    if (ago < 0 || ago >= days) continue;
    arr[days - 1 - ago].total += 1;
    if (r.status === 'failed' || r.status === 'timeout' || r.status === 'crashed') {
      arr[days - 1 - ago].failed += 1;
    }
  }
  return arr;
}

export interface TaskBreakdown {
  task_id: string;
  task_name: string;
  total: number;
  success: number;
  failed: number;
  running: number;
  skipped: number;
}

export function topTasks(
  runs: (JobRunSummary & { task_name?: string | null })[],
  limit = 6,
): TaskBreakdown[] {
  const m = new Map<string, TaskBreakdown>();
  for (const r of runs) {
    const cur =
      m.get(r.task_id) ||
      {
        task_id: r.task_id,
        task_name: r.task_name || r.task_id,
        total: 0,
        success: 0,
        failed: 0,
        running: 0,
        skipped: 0,
      };
    cur.total += 1;
    cur[aggKey(r.status)] += 1;
    m.set(r.task_id, cur);
  }
  return Array.from(m.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

/** Best-effort next-run estimator from a systemd OnCalendar expression. */
export function nextRunAt(expr: string | null | undefined): Date | null {
  const now = dayjs();
  if (!expr) return null;
  if (expr.includes('*:*/2:00')) return now.add(90, 'second').toDate();
  if (expr.includes('*:*/5:00')) return now.add(3, 'minute').add(12, 'second').toDate();
  if (expr.includes('*:00,15,30,45:00')) return now.add(7, 'minute').toDate();
  if (expr.includes('*:10:00')) return now.add(28, 'minute').toDate();
  if (expr.includes('*:30:00')) return now.add(18, 'minute').toDate();
  const dailyMatch = expr.match(/^\*-\*-\* (\d{1,2}):(\d{1,2}):00$/);
  if (dailyMatch) {
    let target = now
      .hour(parseInt(dailyMatch[1], 10))
      .minute(parseInt(dailyMatch[2], 10))
      .second(0)
      .millisecond(0);
    if (target.isBefore(now)) target = target.add(1, 'day');
    return target.toDate();
  }
  if (expr.startsWith('Sun') || expr.startsWith('Sat') || expr.startsWith('Mon..Fri')) {
    return now.add(1, 'day').toDate();
  }
  if (expr.match(/\*-\*-\d+/)) return now.add(3, 'day').toDate();
  return now.add(1, 'hour').toDate();
}

export { relTime, relTimeFuture, fmtDuration } from './date';
