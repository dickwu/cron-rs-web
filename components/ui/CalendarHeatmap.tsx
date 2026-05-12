import React from 'react';

export interface HeatmapDay {
  total: number;
  failed: number;
}

export function CalendarHeatmap({ data }: { data: HeatmapDay[] }) {
  const today = new Date();
  const todayDow = today.getDay();
  const cells = data.slice(-364 - todayDow);
  const weeks = Math.ceil((cells.length + todayDow) / 7);
  const grid: (HeatmapDay | null)[][] = Array.from({ length: 7 }, () => Array(weeks).fill(null));
  cells.forEach((d, i) => {
    const week = Math.floor((todayDow + i) / 7);
    const day = (todayDow + i) % 7;
    grid[day][week] = d;
  });

  const levelOf = (d: HeatmapDay | null) => {
    if (!d || d.total === 0) return 0;
    if (d.total <= 1) return 1;
    if (d.total <= 3) return 2;
    if (d.total <= 6) return 3;
    return 4;
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '20px 1fr', gap: 6 }}>
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
        style={{
          display: 'grid',
          gridTemplateRows: 'repeat(7, 1fr)',
          gridTemplateColumns: `repeat(${weeks}, 1fr)`,
          gap: 3,
          gridAutoFlow: 'column',
        }}
      >
        {grid.flatMap((row, dayIdx) =>
          row.map((d, weekIdx) => (
            <div
              key={dayIdx + '-' + weekIdx}
              className={`day ${d && d.failed > 0 ? 'has-failure' : ''}`}
              data-level={levelOf(d)}
              data-tooltip={d ? `${d.total} runs · ${d.failed} failed` : 'no data'}
              style={{
                borderRadius: 2,
                background: !d || d.total === 0 ? 'var(--border-subtle)' : undefined,
                aspectRatio: '1',
                cursor: 'pointer',
              }}
            />
          )),
        )}
      </div>
    </div>
  );
}
