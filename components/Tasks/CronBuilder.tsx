'use client';

import React, { useMemo } from 'react';
import { CronTimeline, vizForSchedule } from '@/components/ui/CronTimeline';
import { Tag } from '@/components/ui/Tag';
import { NextRunsPreview } from './NextRunsPreview';

const PRESETS: Array<{ label: string; expr: string }> = [
  // systemd rejects `*/N` steps in OnCalendar; the valid form is `0/N`.
  { label: 'Every 2 min', expr: '*-*-* *:0/2:00' },
  { label: 'Every 5 min', expr: '*-*-* *:0/5:00' },
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
        <NextRunsPreview schedule={value} />
      </div>
    </>
  );
}
