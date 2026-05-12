/**
 * Format any timestamp as `YYYY-MM-DD HH:MM` in the user's local time zone.
 * Returns the literal placeholder for null/undefined and falls back to the
 * raw input string if the value can't be parsed (e.g. an empty string).
 *
 * The daemon writes UTC timestamps either as RFC 3339 with `Z`
 * (`2026-05-12T02:12:59Z`) or, for rows older than that change, as
 * `YYYY-MM-DD HH:MM:SS` with no zone marker. The space-separated form is
 * non-standard ISO 8601 — Chrome/Firefox parse it as **local** time, which
 * makes a UTC value display as if it were in the viewer's zone (off by the
 * full UTC offset). Force-parse anything without an explicit zone as UTC so
 * legacy rows render in the same timezone as new ones.
 */
export function fmtDateTime(input: string | number | Date | null | undefined, placeholder = '-'): string {
  if (input === null || input === undefined || input === '') return placeholder;
  const d = parseAsUtcIfNaive(input);
  if (Number.isNaN(d.getTime())) return String(input);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

function parseAsUtcIfNaive(input: string | number | Date): Date {
  if (input instanceof Date) return input;
  if (typeof input !== 'string') return new Date(input);
  const hasTzSuffix = /(Z|[+-]\d{2}:?\d{2})$/.test(input);
  const isoLike = input.includes(' ') && !input.includes('T') ? input.replace(' ', 'T') : input;
  return new Date(hasTzSuffix ? isoLike : `${isoLike}Z`);
}
