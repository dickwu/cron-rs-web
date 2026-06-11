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

const DOW_NAMES: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

/** Expand systemd named shorthands (daily, weekly, …) to an OnCalendar form. */
function expandNamedSchedule(s: string): string | null {
  switch (s) {
    case 'minutely':
      return '*-*-* *:*:00';
    case 'hourly':
      return '*-*-* *:00:00';
    case 'daily':
      return '*-*-* 00:00:00';
    case 'weekly':
      return 'mon *-*-* 00:00:00';
    case 'monthly':
      return '*-*-01 00:00:00';
    case 'quarterly':
      return '*-01,04,07,10-01 00:00:00';
    case 'semiannually':
      return '*-01,07-01 00:00:00';
    case 'yearly':
    case 'annually':
      return '*-01-01 00:00:00';
    default:
      return null;
  }
}

/**
 * Expand one systemd calendar field (e.g. `*`, `5`, `1,15`, `7..21`, `*​/5`,
 * `0/10`) into the set of matching values within [min, max].
 */
function parseNumField(field: string, min: number, max: number): Set<number> {
  const out = new Set<number>();
  for (const raw of field.split(',')) {
    const tok = raw.trim();
    if (!tok) continue;
    let base = tok;
    let step = 1;
    const slash = tok.indexOf('/');
    if (slash >= 0) {
      base = tok.slice(0, slash);
      step = Number(tok.slice(slash + 1)) || 1;
    }
    if (base === '*' || base === '') {
      for (let v = min; v <= max; v += step) out.add(v);
    } else if (base.includes('..')) {
      const [loS, hiS] = base.split('..');
      const lo = Number(loS);
      const hi = Number(hiS);
      if (Number.isNaN(lo) || Number.isNaN(hi)) continue;
      for (let v = lo; v <= hi; v += step) if (v >= min && v <= max) out.add(v);
    } else {
      const startV = Number(base);
      if (Number.isNaN(startV)) continue;
      if (slash >= 0) {
        for (let v = startV; v <= max; v += step) if (v >= min) out.add(v);
      } else if (startV >= min && startV <= max) {
        out.add(startV);
      }
    }
  }
  return out;
}

function dowNum(s: string): number | null {
  const t = s.trim().toLowerCase();
  if (t in DOW_NAMES) return DOW_NAMES[t];
  const key = t.slice(0, 3);
  if (key in DOW_NAMES) return DOW_NAMES[key];
  const n = Number(t);
  if (!Number.isNaN(n)) return ((n % 7) + 7) % 7; // systemd: 7 == Sunday
  return null;
}

/** Parse a day-of-week field into a set of 0..6 (Sun=0); null means "any". */
function parseDow(field: string): Set<number> | null {
  const f = field.trim();
  if (!f || f === '*') return null;
  const out = new Set<number>();
  for (const tok of f.split(',')) {
    if (tok.includes('..')) {
      const [a, b] = tok.split('..');
      const lo = dowNum(a);
      const hi = dowNum(b);
      if (lo === null || hi === null) continue;
      let v = lo;
      for (let i = 0; i < 7; i += 1) {
        out.add(v % 7);
        if (v % 7 === hi) break;
        v += 1;
      }
    } else {
      const d = dowNum(tok);
      if (d !== null) out.add(d);
    }
  }
  return out.size ? out : null;
}

interface ParsedCalendar {
  year: Set<number> | null; // null == any year
  month: Set<number>;
  day: Set<number>;
  dow: Set<number> | null; // null == any weekday
  hour: Set<number>;
  minute: Set<number>;
  second: Set<number>;
}

function parseOnCalendar(expr: string): ParsedCalendar | null {
  const parts = expr.trim().split(/\s+/);
  let dowField: string | null = null;
  let dateField: string;
  let timeField: string;

  const hasDate = (p: string) => p.includes('-');
  const hasTime = (p: string) => p.includes(':');

  if (parts.length >= 3 && !hasDate(parts[0]) && !hasTime(parts[0]) && hasDate(parts[1])) {
    [dowField, dateField, timeField] = parts;
  } else if (parts.length === 2 && hasDate(parts[0]) && hasTime(parts[1])) {
    [dateField, timeField] = parts;
  } else if (parts.length === 2 && !hasDate(parts[0]) && hasTime(parts[1])) {
    // weekday + time-only, e.g. "Mon..Fri 09:00:00"
    [dowField, timeField] = parts;
    dateField = '*-*-*';
  } else if (parts.length === 1 && hasTime(parts[0])) {
    dateField = '*-*-*';
    timeField = parts[0];
  } else if (parts.length === 1 && hasDate(parts[0])) {
    dateField = parts[0];
    timeField = '00:00:00';
  } else {
    return null;
  }

  const dseg = dateField.split('-');
  if (dseg.length !== 3) return null;
  const year = dseg[0] === '*' ? null : parseNumField(dseg[0], 0, 9999);
  const month = parseNumField(dseg[1], 1, 12);
  const day = parseNumField(dseg[2], 1, 31);

  const tseg = timeField.split(':');
  if (tseg.length < 2) return null;
  const hour = parseNumField(tseg[0], 0, 23);
  const minute = parseNumField(tseg[1], 0, 59);
  const second = tseg.length >= 3 ? parseNumField(tseg[2], 0, 59) : new Set([0]);

  if (!month.size || !day.size || !hour.size || !minute.size) return null;

  return {
    year,
    month,
    day,
    dow: dowField ? parseDow(dowField) : null,
    hour,
    minute,
    second,
  };
}

/**
 * Next fire time for a systemd OnCalendar expression, evaluated in local time
 * like the host's systemd would. Steps days (≤ ~2 years) and then picks the
 * earliest matching hh:mm — cheap enough to call per keystroke in the
 * schedule builder. Returns null when the expression can't be parsed or has
 * no occurrence in range.
 */
export function nextRunAt(expr: string | null | undefined): Date | null {
  if (!expr) return null;
  const trimmed = expr.trim();
  const cal = parseOnCalendar(expandNamedSchedule(trimmed.toLowerCase()) ?? trimmed);
  if (!cal) return null;

  const hours = [...cal.hour].sort((a, b) => a - b);
  const minutes = [...cal.minute].sort((a, b) => a - b);
  const second = cal.second.size ? Math.min(...cal.second) : 0;

  const now = new Date();
  const MAX_DAYS = 366 * 2; // ~2 years
  for (let i = 0; i <= MAX_DAYS; i += 1) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    if (cal.year && !cal.year.has(day.getFullYear())) continue;
    if (!cal.month.has(day.getMonth() + 1)) continue;
    if (!cal.day.has(day.getDate())) continue;
    if (cal.dow && !cal.dow.has(day.getDay())) continue;

    for (const h of hours) {
      for (const m of minutes) {
        const candidate = new Date(
          day.getFullYear(),
          day.getMonth(),
          day.getDate(),
          h,
          m,
          second,
        );
        if (candidate.getTime() > now.getTime()) return candidate;
      }
    }
  }
  return null;
}

export { relTime, relTimeFuture, fmtDuration } from './date';
