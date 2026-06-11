'use client';

import React from 'react';
import { CalendarHeatmap } from '@/components/ui/CalendarHeatmap';
import { useDashboardHeatmap } from '@/hooks/useDashboard';

export function HeatmapCard() {
  const { heatmap } = useDashboardHeatmap();
  const buckets = heatmap?.buckets ?? [];
  const total = buckets.reduce((a, b) => a + b.total, 0);
  const failed = buckets.reduce((a, b) => a + b.failed, 0);
  const fmt = (n: number) => n.toLocaleString('en-US');

  return (
    <div className="card card-visible">
      <div className="card-head">
        <div>
          <div className="card-title">Run frequency · 12 months</div>
          <div className="card-sub">
            <span className="mono">{fmt(total)}</span> runs ·{' '}
            <span className="mono" style={{ color: 'var(--c-error)' }}>
              {fmt(failed)}
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
        <CalendarHeatmap data={buckets} />
      </div>
    </div>
  );
}
