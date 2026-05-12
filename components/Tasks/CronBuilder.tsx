'use client';

import React, { useMemo } from 'react';
import { CronTimeline, vizForSchedule } from '@/components/ui/CronTimeline';
import { Tag } from '@/components/ui/Tag';
import { nextRunAt } from '@/lib/analytics';
import { relTimeFuture, dayjs } from '@/lib/date';

const PRESETS: Array<{ label: string; expr: string }> = [
  { label: 'Every 2 min', expr: '*-*-* *:*/2:00' },
  { label: 'Every 5 min', expr: '*-*-* *:*/5:00' },
  { label: 'Every 15 min', expr: '*-*-* *:00,15,30,45:00' },
  { label: 'Hourly :10', expr: '*-*-* *:10:00' },
  { label: 'Daily 02:00', expr: '*-*-* 02:00:00' },
  { label: 'Daily 03:30', expr: '*-*-* 03:30:00' },
  { label: 'Sun 04:00', expr: 'Sun *-*-* 04:00:00' },
  { label: 'Weekdays 09', expr: 'Mon..Fri *-*-* 09:00:00' },
  { label: '1st 07:00', expr: '*-*-01 07:00:00' },
];

export function CronBuilder({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const viz = useMemo(() => vizForSchedule(value), [value]);

  const next5 = useMemo(() => {
    const start = nextRunAt(value);
    if (!start) return [] as Date[];
    const arr: Date[] = [];
    let cur = start;
    for (let i = 0; i < 5; i++) {
      arr.push(cur);
      const step = value.includes('*:*/2:00')
        ? 2 * 60000
        : value.includes('*:*/5:00')
        ? 5 * 60000
        : value.includes('*:00,15,30,45:00')
        ? 15 * 60000
        : value.startsWith('Sun') || value.startsWith('Mon..Fri')
        ? 86400000
        : value.includes('*-*-01') || value.includes('*-*-15')
        ? 30 * 86400000
        : 3600 * 1000;
      cur = new Date(cur.getTime() + step);
    }
    return arr;
  }, [value]);

  return (
    <>
      <div className="flex gap-2" style={{ flexWrap: 'wrap', marginBottom: 12 }}>
        {PRESETS.map((p) => (
          <Tag
            key={p.label}
            subtle={value !== p.expr}
            active={value === p.expr}
            onClick={() => onChange(p.expr)}
          >
            {p.label}
          </Tag>
        ))}
      </div>

      <div className="mb-3">
        <input
          className="input mono"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="*-*-* 02:00:00"
        />
        <div
          className="help"
          style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}
        >
          systemd <code style={{ fontFamily: 'var(--font-mono)' }}>OnCalendar=</code>{' '}
          expression
        </div>
      </div>

      <CronTimeline minute={viz.minute} hour={viz.hour} />

      <div className="mt-4">
        <div
          className="fz-11 muted"
          style={{ textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}
        >
          Next 5 runs
        </div>
        <div
          className="mono fz-12"
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: 12,
          }}
        >
          {next5.length === 0 && <div className="muted">—</div>}
          {next5.map((d, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '3px 0',
              }}
            >
              <span style={{ color: 'var(--text-secondary)' }}>
                {dayjs(d).format('ddd, MMM D · HH:mm')}
              </span>
              <span className="muted">{relTimeFuture(d)}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
