import React from 'react';
import { parseOnCalendar } from '@/lib/calendar';

export function CronTimeline({
  minute,
  hour,
}: {
  minute?: number[];
  hour?: number[];
}) {
  const row = (label: string, cells: number[] | undefined, length: number) => {
    const set = new Set(cells || []);
    return (
      <div className="cron-timeline-row" key={label}>
        <div className="cron-timeline-label">{label}</div>
        <div className="cron-timeline-track">
          {Array.from({ length }).map((_, i) => (
            <div
              key={i}
              className={`cron-timeline-cell ${set.has(i) ? 'on' : ''}`}
              title={i.toString()}
            />
          ))}
        </div>
      </div>
    );
  };
  return (
    <div className="cron-timeline">
      {row('hour', hour, 24)}
      {row('minute', minute, 60)}
    </div>
  );
}

/**
 * Minutes and hours an expression fires at, for the timeline visualization.
 * Derived from the real OnCalendar parser rather than pattern-matching
 * presets, so any valid expression renders correctly.
 */
export function vizForSchedule(expr: string): { minute: number[]; hour: number[] } {
  const all24 = Array.from({ length: 24 }, (_, i) => i);
  const cal = expr ? parseOnCalendar(expr) : null;
  if (!cal) return { minute: [], hour: all24 };
  return {
    minute: [...cal.minute].sort((a, b) => a - b),
    hour: [...cal.hour].sort((a, b) => a - b),
  };
}
