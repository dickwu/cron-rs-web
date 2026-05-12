import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import relativeTime from 'dayjs/plugin/relativeTime';
import duration from 'dayjs/plugin/duration';

dayjs.extend(utc);
dayjs.extend(relativeTime);
dayjs.extend(duration);

/**
 * Parse a server timestamp robustly. The daemon writes UTC either as RFC 3339
 * with `Z`/offset, or for older rows as `YYYY-MM-DD HH:MM:SS` with no zone marker.
 * The space-separated form is non-standard and is parsed as **local** by both
 * Chrome and Firefox; treat any zoneless input as UTC so legacy and new rows
 * agree on the wall-clock value the user sees.
 */
export function parseDate(input: string | number | Date | null | undefined): dayjs.Dayjs | null {
  if (input === null || input === undefined || input === '') return null;
  if (input instanceof Date) return dayjs(input);
  if (typeof input === 'number') return dayjs(input);

  const hasTzSuffix = /(Z|[+-]\d{2}:?\d{2})$/.test(input);
  const isoLike = input.includes(' ') && !input.includes('T') ? input.replace(' ', 'T') : input;
  const parsed = hasTzSuffix ? dayjs(isoLike) : dayjs.utc(isoLike).local();
  return parsed.isValid() ? parsed : null;
}

export function fmtDateTime(
  input: string | number | Date | null | undefined,
  placeholder = '-',
): string {
  const d = parseDate(input);
  if (!d) return placeholder;
  return d.format('YYYY-MM-DD HH:mm');
}

export function fmtDateTimeLong(
  input: string | number | Date | null | undefined,
  placeholder = '-',
): string {
  const d = parseDate(input);
  if (!d) return placeholder;
  return d.format('ddd, MMM D, HH:mm:ss');
}

export function relTime(input: string | number | Date): string {
  const d = parseDate(input);
  if (!d) return '—';
  const diff = dayjs().diff(d, 'second');
  if (diff < 0) return relTimeFuture(input);
  if (diff < 60) return Math.max(1, diff) + 's ago';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

export function relTimeFuture(input: string | number | Date): string {
  const d = parseDate(input);
  if (!d) return '—';
  const diff = d.diff(dayjs(), 'second');
  if (diff < 0) return 'now';
  if (diff < 60) return 'in ' + diff + 's';
  if (diff < 3600) return 'in ' + Math.floor(diff / 60) + 'm';
  if (diff < 86400) return 'in ' + Math.floor(diff / 3600) + 'h';
  return 'in ' + Math.floor(diff / 86400) + 'd';
}

export function fmtDuration(ms: number | null | undefined): string {
  if (ms == null) return '—';
  if (ms < 1000) return ms + 'ms';
  const d = dayjs.duration(ms);
  if (ms < 60000) return (ms / 1000).toFixed(1) + 's';
  return d.minutes() + 'm ' + d.seconds() + 's';
}

export function nowTs(): number {
  return dayjs().valueOf();
}

export { dayjs };
