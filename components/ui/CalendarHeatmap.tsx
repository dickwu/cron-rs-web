import React from 'react';
import type { HeatmapDayCount } from '@/lib/types';

const MS_PER_DAY = 86400 * 1000;

const monthFmt = new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' });
const dayFmt = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

interface DayCell {
  date: Date;
  total: number;
  failed: number;
}

/**
 * GitHub-style year heatmap: columns are weeks (oldest left), rows are
 * Sun..Sat. Data is sparse, keyed by UTC date; intensity scales relative to
 * the busiest day so the chart stays readable at any run volume.
 */
export function CalendarHeatmap({ data }: { data: HeatmapDayCount[] }) {
  const byDate = new Map(data.map((d) => [d.date, d]));

  // The last column is the current (UTC) week; the first cell is the Sunday
  // that starts the week 52 weeks earlier, so the grid covers a full year
  // ending today. Cells after today render as invisible fillers.
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const todayDow = today.getUTCDay();
  const start = new Date(today.getTime() - (364 + todayDow) * MS_PER_DAY);
  const totalDays = 364 + todayDow + 1;
  const weeks = Math.ceil(totalDays / 7);

  const max = data.reduce((m, d) => Math.max(m, d.total), 0);
  const levelOf = (total: number) => {
    if (total <= 0 || max <= 0) return 0;
    return Math.min(4, Math.max(1, Math.ceil((total / max) * 4)));
  };

  const columns: (DayCell | null)[][] = Array.from({ length: weeks }, (_, week) =>
    Array.from({ length: 7 }, (_, dow) => {
      const idx = week * 7 + dow;
      if (idx >= totalDays) return null;
      const date = new Date(start.getTime() + idx * MS_PER_DAY);
      const entry = byDate.get(date.toISOString().slice(0, 10));
      return { date, total: entry?.total ?? 0, failed: entry?.failed ?? 0 };
    }),
  );

  // Label a column when its first day starts a new month vs the previous
  // column; the first column stays unlabeled to avoid a clipped edge label.
  const monthLabels = columns.map((col, week) => {
    if (week === 0) return '';
    const day = col[0];
    const prev = columns[week - 1][0];
    if (!day || !prev) return '';
    return day.date.getUTCMonth() !== prev.date.getUTCMonth() ? monthFmt.format(day.date) : '';
  });

  const fmt = (n: number) => n.toLocaleString('en-US');
  const tooltipFor = (d: DayCell) =>
    d.total === 0
      ? `${dayFmt.format(d.date)} · no runs`
      : `${dayFmt.format(d.date)} · ${fmt(d.total)} runs · ${fmt(d.failed)} failed`;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '20px 1fr',
        gridTemplateRows: '14px 1fr',
        columnGap: 6,
        rowGap: 2,
      }}
    >
      <div />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${weeks}, 1fr)`,
          gap: 3,
          fontSize: 9,
          color: 'var(--text-muted)',
        }}
      >
        {monthLabels.map((label, week) => (
          <div key={week} style={{ whiteSpace: 'nowrap', overflow: 'visible' }}>
            {label}
          </div>
        ))}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateRows: 'repeat(7, 1fr)',
          gap: 3,
          fontSize: 9,
          color: 'var(--text-muted)',
          paddingTop: 2,
        }}
      >
        {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((d, i) => (
          <div key={i} style={{ lineHeight: 1.6 }}>
            {d}
          </div>
        ))}
      </div>
      <div
        className="heatmap"
        style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)`, alignItems: 'stretch' }}
      >
        {columns.map((col, week) => (
          <div
            key={week}
            style={{ display: 'grid', gridTemplateRows: 'repeat(7, 1fr)', gap: 3 }}
          >
            {col.map((d, dow) =>
              d === null ? (
                <div key={dow} />
              ) : (
                <div
                  key={dow}
                  className={`day ${d.failed > 0 ? 'has-failure' : ''}`}
                  data-level={levelOf(d.total)}
                  data-tooltip={tooltipFor(d)}
                />
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
