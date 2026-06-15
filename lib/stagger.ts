/**
 * Client-side mirror of the backend's every-minute stagger logic.
 *
 * The daemon spreads tasks that fire every minute across distinct seconds so
 * they never all start at :00 together. The DB keeps the canonical `:00`
 * schedule; the stagger second is applied only when the systemd unit is
 * rendered. To show the *real* next-run times in the dashboard, the frontend
 * reproduces that assignment here.
 *
 * Keep this in sync with `cron-rs/src/systemd/unit_gen.rs`
 * (`is_every_minute_schedule`, `apply_stagger_second`, `stagger_assignments`).
 */

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Split the single `H:M[:S]` token of a calendar expression into components.
 * Returns null when there is no time token, more than one, or it has more than
 * three `:`-separated parts — mirroring the Rust `time_parts`.
 */
function timeParts(schedule: string): [string, string, string | undefined] | null {
  const timeTokens = schedule
    .trim()
    .split(/\s+/)
    .filter((t) => t.includes(':'));
  if (timeTokens.length !== 1) return null;
  const parts = timeTokens[0].split(':');
  if (parts.length < 2 || parts.length > 3) return null;
  return [parts[0], parts[1], parts.length === 3 ? parts[2] : undefined];
}

/**
 * True when a schedule fires every minute at second zero: the `minutely`
 * shorthand, or a calendar expression whose minute component is `*` and whose
 * seconds component is absent or all zeros. These are the timers that collide
 * at :00 of every minute unless staggered.
 */
export function isEveryMinuteSchedule(schedule: string): boolean {
  const s = schedule.trim();
  if (s.toLowerCase() === 'minutely') return true;
  const tp = timeParts(s);
  if (!tp) return false;
  const [, minute, second] = tp;
  if (minute !== '*') return false;
  if (second === undefined) return true;
  return second.length > 0 && [...second].every((c) => c === '0');
}

/**
 * Rewrite an every-minute schedule so it fires at `second` instead of :00.
 * Schedules that do not fire every minute are returned unchanged.
 */
export function applyStaggerSecond(schedule: string, second: number): string {
  if (!isEveryMinuteSchedule(schedule)) return schedule;
  const trimmed = schedule.trim();
  if (trimmed.toLowerCase() === 'minutely') {
    return `*-*-* *:*:${pad2(second)}`;
  }
  return trimmed
    .split(/\s+/)
    .map((token) => {
      if (!token.includes(':')) return token;
      // isEveryMinuteSchedule guaranteed exactly one time token with two or
      // three components.
      const parts = token.split(':');
      return `${parts[0]}:${parts[1]}:${pad2(second)}`;
    })
    .join(' ');
}

/**
 * Evenly-spread stagger seconds for every-minute tasks, keyed by task id.
 *
 * Slot `i` of `n` is `(2i+1)*30/n` (integer division): slots are centered
 * within the minute so no task lands on second 0 while staying distinct for up
 * to 60 tasks. Assignment is ordered by task id and includes disabled tasks,
 * matching the daemon so the dashboard's predicted seconds equal the real ones.
 */
export function staggerAssignments(
  tasks: ReadonlyArray<{ id: string; schedule: string }>,
): Map<string, number> {
  const ids = tasks
    .filter((t) => isEveryMinuteSchedule(t.schedule))
    .map((t) => t.id)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const n = ids.length;
  const assignments = new Map<string, number>();
  ids.forEach((id, i) => {
    assignments.set(id, Math.min(Math.floor(((2 * i + 1) * 30) / n), 59));
  });
  return assignments;
}
