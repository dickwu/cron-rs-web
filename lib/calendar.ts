/**
 * Client-side evaluation of systemd `OnCalendar=` expressions.
 *
 * This is the fallback used when the daemon's
 * `GET /api/v1/schedule/preview` endpoint is unavailable (older backends) and
 * for list views where asking the server once per task would be wasteful.
 *
 * Occurrences are computed as wall-clock times in the *server's* timezone
 * (exposed by the daemon as `timezone` on `/api/v1/status`) because that is
 * where systemd evaluates the timer. When the server timezone is unknown the
 * browser's zone is used.
 */
import { normalizeScheduleExpression } from './schedule';

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
 * Expand one systemd calendar field (e.g. `*`, `5`, `1,15`, `7..21`,
 * `7..21/2`, `0/10`) into the set of matching values within [min, max].
 * Returns null when a token is not understood.
 */
function parseNumField(field: string, min: number, max: number): Set<number> | null {
  const out = new Set<number>();
  for (const raw of field.split(',')) {
    const tok = raw.trim();
    if (!tok) return null;
    let base = tok;
    let step = 1;
    const slash = tok.indexOf('/');
    if (slash >= 0) {
      base = tok.slice(0, slash);
      step = Number(tok.slice(slash + 1));
      if (!Number.isInteger(step) || step <= 0) return null;
    }
    if (base === '*') {
      for (let v = min; v <= max; v += step) out.add(v);
    } else if (base.includes('..')) {
      const [loS, hiS] = base.split('..');
      const lo = Number(loS);
      const hi = Number(hiS);
      if (!Number.isInteger(lo) || !Number.isInteger(hi)) return null;
      for (let v = lo; v <= hi; v += step) if (v >= min && v <= max) out.add(v);
    } else {
      const startV = Number(base);
      if (base === '' || !Number.isInteger(startV)) return null;
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
  return null;
}

/** Parse a day-of-week field into a set of 0..6 (Sun=0); null means "any". */
function parseDow(field: string): Set<number> | null | undefined {
  const f = field.trim();
  if (!f || f === '*') return null;
  const out = new Set<number>();
  for (const tok of f.split(',')) {
    if (tok.includes('..')) {
      const [a, b] = tok.split('..');
      const lo = dowNum(a);
      const hi = dowNum(b);
      if (lo === null || hi === null) return undefined;
      let v = lo;
      for (let i = 0; i < 7; i += 1) {
        out.add(v % 7);
        if (v % 7 === hi) break;
        v += 1;
      }
    } else {
      const d = dowNum(tok);
      if (d === null) return undefined;
      out.add(d);
    }
  }
  return out.size ? out : null;
}

export interface ParsedCalendar {
  year: Set<number> | null; // null == any year
  month: Set<number>;
  day: Set<number>;
  dow: Set<number> | null; // null == any weekday
  hour: Set<number>;
  minute: Set<number>;
  second: Set<number>;
  /** Explicit timezone suffix (`UTC`, `Europe/Berlin`), if any. */
  timeZone: string | null;
}

function isTimeZoneToken(token: string): boolean {
  if (/^(utc|gmt|z)$/i.test(token)) return true;
  return token.includes('/') && /^[A-Za-z_]+\/[A-Za-z_\/+-]+$/.test(token) && isValidTimeZone(token);
}

/** Parse an OnCalendar expression (or a 5-field cron / named shorthand). */
export function parseOnCalendar(input: string): ParsedCalendar | null {
  let expr = input.trim();
  if (!expr) return null;

  const named = expandNamedSchedule(expr.toLowerCase());
  if (named) {
    expr = named;
  } else if (expr.startsWith('@') || expr.split(/\s+/).length === 5) {
    try {
      expr = normalizeScheduleExpression(expr);
    } catch {
      return null;
    }
  }

  let parts = expr.split(/\s+/);
  let timeZone: string | null = null;
  if (parts.length > 1 && isTimeZoneToken(parts[parts.length - 1])) {
    const tz = parts[parts.length - 1];
    timeZone = /^(utc|gmt|z)$/i.test(tz) ? 'UTC' : tz;
    parts = parts.slice(0, -1);
  }

  let dowField: string | null = null;
  let dateField: string;
  let timeField: string;

  const hasDate = (p: string) => p.includes('-');
  const hasTime = (p: string) => p.includes(':');

  if (parts.length === 3 && !hasDate(parts[0]) && !hasTime(parts[0]) && hasDate(parts[1])) {
    [dowField, dateField, timeField] = parts;
  } else if (parts.length === 2 && hasDate(parts[0]) && hasTime(parts[1])) {
    [dateField, timeField] = parts;
  } else if (parts.length === 2 && !hasDate(parts[0]) && hasTime(parts[1])) {
    // weekday + time-only, e.g. "Mon..Fri 09:00:00"
    [dowField, timeField] = parts;
    dateField = '*-*-*';
  } else if (parts.length === 2 && !hasDate(parts[0]) && !hasTime(parts[0]) && hasDate(parts[1])) {
    // weekday + date-only, e.g. "Mon *-*-*"
    [dowField, dateField] = parts;
    timeField = '00:00:00';
  } else if (parts.length === 1 && hasTime(parts[0])) {
    dateField = '*-*-*';
    timeField = parts[0];
  } else if (parts.length === 1 && hasDate(parts[0])) {
    dateField = parts[0];
    timeField = '00:00:00';
  } else if (parts.length === 1 && dowNum(parts[0].split(/[.,]/)[0]) !== null) {
    // weekday only, e.g. "Mon" or "Sat,Sun"
    dowField = parts[0];
    dateField = '*-*-*';
    timeField = '00:00:00';
  } else {
    return null;
  }

  let dseg = dateField.split('-');
  if (dseg.length === 2) dseg = ['*', ...dseg]; // "MM-DD"
  if (dseg.length !== 3) return null;
  const year = dseg[0] === '*' ? null : parseNumField(dseg[0], 0, 9999);
  const month = parseNumField(dseg[1], 1, 12);
  const day = parseNumField(dseg[2], 1, 31);

  const tseg = timeField.split(':');
  if (tseg.length < 2 || tseg.length > 3) return null;
  const hour = parseNumField(tseg[0], 0, 23);
  const minute = parseNumField(tseg[1], 0, 59);
  // Fractional seconds are not supported; drop them.
  const second = tseg.length === 3 ? parseNumField(tseg[2].split('.')[0], 0, 59) : new Set([0]);
  const dow = dowField ? parseDow(dowField) : null;

  if (dseg[0] !== '*' && !year) return null;
  if (!month || !day || !hour || !minute || !second || dow === undefined) return null;
  if (!month.size || !day.size || !hour.size || !minute.size || !second.size) return null;

  return { year, month, day, dow, hour, minute, second, timeZone };
}

// --- timezone helpers -----------------------------------------------------

const formatterCache = new Map<string, Intl.DateTimeFormat>();

export function isValidTimeZone(tz: string | null | undefined): tz is string {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function formatterFor(tz: string): Intl.DateTimeFormat {
  let f = formatterCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    formatterCache.set(tz, f);
  }
  return f;
}

/** Wall-clock fields of `instant` in `tz`, encoded as a UTC epoch (ms). */
function wallMsInZone(instant: number, tz: string): number {
  const parts = formatterFor(tz).formatToParts(new Date(instant));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') % 24,
    get('minute'),
    get('second'),
  );
}

/** Offset (ms) of `tz` from UTC at `instant`. */
function offsetAt(instant: number, tz: string): number {
  const truncated = Math.floor(instant / 1000) * 1000;
  return wallMsInZone(truncated, tz) - truncated;
}

/**
 * Convert a wall-clock time in `tz` (encoded as UTC epoch ms) to an instant.
 * Returns null for wall times skipped by a DST transition (systemd does not
 * fire those either).
 */
function wallToInstant(wallMs: number, tz: string): number | null {
  let guess = wallMs - offsetAt(wallMs, tz);
  const off2 = offsetAt(guess, tz);
  guess = wallMs - off2;
  return wallMsInZone(guess, tz) === wallMs ? guess : null;
}

// --- next-run computation -------------------------------------------------

export interface NextRunsOptions {
  count?: number;
  /** IANA zone the timer is evaluated in; defaults to the browser zone. */
  timeZone?: string | null;
  /** Start point (exclusive); defaults to now. */
  from?: Date;
}

const DAY_MS = 86_400_000;

/**
 * The next `count` fire times of a systemd OnCalendar expression, evaluated in
 * the server timezone. Scans up to ~5 years of days, which is enough for any
 * realistic expression and cheap because whole days are rejected early.
 * Returns an empty array when the expression cannot be parsed.
 */
export function nextRuns(expr: string | null | undefined, opts: NextRunsOptions = {}): Date[] {
  if (!expr) return [];
  const cal = parseOnCalendar(expr);
  if (!cal) return [];

  const count = Math.max(1, opts.count ?? 1);
  const tz = isValidTimeZone(cal.timeZone)
    ? cal.timeZone
    : isValidTimeZone(opts.timeZone)
    ? opts.timeZone
    : browserTimeZone();
  const from = (opts.from ?? new Date()).getTime();
  const fromWall = wallMsInZone(from, tz);

  const hours = [...cal.hour].sort((a, b) => a - b);
  const minutes = [...cal.minute].sort((a, b) => a - b);
  const seconds = [...cal.second].sort((a, b) => a - b);

  const out: Date[] = [];
  const startDay = Math.floor(fromWall / DAY_MS) * DAY_MS;
  const MAX_DAYS = 366 * 5;
  for (let i = 0; i <= MAX_DAYS && out.length < count; i += 1) {
    const dayMs = startDay + i * DAY_MS;
    const day = new Date(dayMs);
    if (cal.year && !cal.year.has(day.getUTCFullYear())) continue;
    if (!cal.month.has(day.getUTCMonth() + 1)) continue;
    if (!cal.day.has(day.getUTCDate())) continue;
    if (cal.dow && !cal.dow.has(day.getUTCDay())) continue;

    for (const h of hours) {
      if (dayMs + (h + 1) * 3_600_000 <= fromWall - 3_600_000) continue;
      for (const m of minutes) {
        for (const s of seconds) {
          const wall = dayMs + h * 3_600_000 + m * 60_000 + s * 1000;
          // Cheap pre-filter on wall time; allow an hour of slack for DST.
          if (wall < fromWall - 3_600_000) continue;
          const instant = wallToInstant(wall, tz);
          if (instant === null || instant <= from) continue;
          out.push(new Date(instant));
          if (out.length >= count) return out;
        }
      }
    }
  }
  return out;
}

/** Next fire time of an OnCalendar expression, or null. */
export function nextRunAt(
  expr: string | null | undefined,
  timeZone?: string | null,
): Date | null {
  return nextRuns(expr, { count: 1, timeZone })[0] ?? null;
}
