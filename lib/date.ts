import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import relativeTime from 'dayjs/plugin/relativeTime';
import duration from 'dayjs/plugin/duration';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(relativeTime);
dayjs.extend(duration);
dayjs.extend(timezone);

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
  if (ms < 60000) return (ms / 1000).toFixed(1) + 's';
  // Compute from the total so long runs keep their hours (and days) instead
  // of wrapping at 60 minutes.
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

/**
 * Format an instant as wall-clock time in `tz` (the server timezone). Falls
 * back to the browser zone when `tz` is missing or not a valid IANA name.
 */
export function fmtInZone(
  input: string | number | Date | null | undefined,
  format: string,
  tz?: string | null,
  placeholder = '—',
): string {
  const d = parseDate(input);
  if (!d) return placeholder;
  if (tz) {
    try {
      return d.tz(tz).format(format);
    } catch {
      // Unknown zone: fall through to local formatting.
    }
  }
  return d.format(format);
}

export function nowTs(): number {
  return dayjs().valueOf();
}

export { dayjs };
