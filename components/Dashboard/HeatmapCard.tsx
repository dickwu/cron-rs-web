'use client';

import React, { useMemo } from 'react';
import { CalendarHeatmap } from '@/components/ui/CalendarHeatmap';
import { useRunSummaries } from '@/hooks/useRuns';
import { buildHeatmap } from '@/lib/analytics';

export function HeatmapCard() {
  const since = useMemo(() => new Date(Date.now() - 365 * 86400 * 1000).toISOString(), []);
  const { runs } = useRunSummaries({ since });
  const data = useMemo(() => buildHeatmap(runs), [runs]);
  const total = data.reduce((a, b) => a + b.total, 0);
  const failed = data.reduce((a, b) => a + b.failed, 0);

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title">Run frequency · 12 months</div>
          <div className="card-sub">
            <span className="mono">{total}</span> runs ·{' '}
            <span className="mono" style={{ color: 'var(--c-error)' }}>
              {failed}
            </span>{' '}
            failed
          </div>
        </div>
        <div className="legend">
          <span className="l-item">less</span>
          {[0, 1, 2, 3, 4].map((lvl) => (
            <span
              key={lvl}
              data-level={lvl}
              style={{
                width: 9,
                height: 9,
                borderRadius: 2,
                background:
                  lvl === 0
                    ? 'var(--border-subtle)'
                    : lvl === 1
                    ? 'var(--c-success-soft)'
                    : lvl === 2
                    ? 'color-mix(in oklab, var(--c-success) 35%, transparent)'
                    : lvl === 3
                    ? 'color-mix(in oklab, var(--c-success) 60%, transparent)'
                    : 'var(--c-success)',
              }}
            />
          ))}
          <span className="l-item">more</span>
        </div>
      </div>
      <div className="card-body">
        <CalendarHeatmap data={data} />
      </div>
    </div>
  );
}
