/**
 * Format any timestamp as `YYYY-MM-DD HH:MM` in the user's local time zone.
 * Returns the literal placeholder for null/undefined and falls back to the
 * raw input string if the value can't be parsed (e.g. an empty string).
 */
export function fmtDateTime(input: string | number | Date | null | undefined, placeholder = '-'): string {
  if (input === null || input === undefined || input === '') return placeholder;
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return String(input);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}
