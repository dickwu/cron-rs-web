import React from 'react';

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

export function vizForSchedule(expr: string): { minute: number[]; hour: number[] } {
  let minute: number[] = [];
  let hour: number[] = [];
  if (!expr) {
    return { minute, hour: Array.from({ length: 24 }, (_, i) => i) };
  }
  // systemd only accepts the `0/N` step form; `*/N` is kept for legacy values.
  const hasMinuteStep = (n: number) => expr.includes(`:0/${n}:`) || expr.includes(`:*/${n}:`);
  if (expr.includes('*:00,15,30,45:00')) minute = [0, 15, 30, 45];
  else if (hasMinuteStep(2)) minute = Array.from({ length: 30 }, (_, i) => i * 2);
  else if (hasMinuteStep(5)) minute = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  else if (hasMinuteStep(10)) minute = [0, 10, 20, 30, 40, 50];
  else if (hasMinuteStep(15)) minute = [0, 15, 30, 45];
  else if (hasMinuteStep(30)) minute = [0, 30];
  else if (expr.match(/\*:(\d{1,2}):00$/)) {
    const m = expr.match(/\*:(\d{1,2}):00$/);
    if (m) minute = [parseInt(m[1], 10)];
  } else {
    const m = expr.match(/(\d+):(\d+):(\d+)$/);
    if (m) {
      hour = [parseInt(m[1], 10)];
      minute = [parseInt(m[2], 10)];
    }
  }
  if (hour.length === 0) hour = Array.from({ length: 24 }, (_, i) => i);
  return { minute, hour };
}
