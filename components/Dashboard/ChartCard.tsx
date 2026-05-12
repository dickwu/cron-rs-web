'use client';

import React, { useMemo, useState } from 'react';
import { StackedChart, type ChartBucket as RenderedBucket } from '@/components/ui/StackedChart';
import { useRunSummaries } from '@/hooks/useRuns';
import { buildBuckets } from '@/lib/analytics';
import type { DashboardRange } from '@/lib/types';

const RANGE_TO_DAYS: Record<DashboardRange, number> = {
  '24h': 1,
  '7d': 7,
  '30d': 30,
};

type ChartMode = 'bars' | 'lines' | 'heatmap';

export function ChartCard() {
  const [range, setRange] = useState<DashboardRange>('24h');
  const [mode, setMode] = useState<ChartMode>('bars');
  const since = useMemo(
    () => new Date(Date.now() - RANGE_TO_DAYS[range] * 86400 * 1000).toISOString(),
    [range],
  );
  const { runs } = useRunSummaries({ since });
  const buckets = useMemo<RenderedBucket[]>(() => buildBuckets(runs, range), [runs, range]);

  const total = buckets.reduce((a, b) => a + b.success + b.failed + b.skipped + b.running, 0);
  const failed = buckets.reduce((a, b) => a + b.failed, 0);
  const success = buckets.reduce((a, b) => a + b.success, 0);
  const successRate = total ? (success / total) * 100 : 0;

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title">Run activity</div>
          <div className="card-sub">
            <span className="mono">{total}</span> runs ·{' '}
            <span
              className="mono"
              style={{
                color:
                  failed === 0
                    ? 'var(--c-success)'
                    : successRate >= 90
                    ? 'var(--c-warning)'
                    : 'var(--c-error)',
              }}
            >
              {successRate.toFixed(1)}% success
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="seg">
            {(['bars', 'lines', 'heatmap'] as const).map((m) => (
              <button
                key={m}
                className={`seg-opt ${mode === m ? 'active' : ''}`}
                onClick={() => setMode(m)}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="seg">
            {(['24h', '7d', '30d'] as const).map((r) => (
              <button
                key={r}
                className={`seg-opt ${range === r ? 'active' : ''}`}
                onClick={() => setRange(r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="card-body">
        <div className="chart-frame">
          <StackedChart buckets={buckets} mode={mode} height={mode === 'heatmap' ? 200 : 220} />
        </div>
        <div className="legend mt-3">
          <span className="l-item">
            <span className="l-swatch" style={{ background: 'var(--c-success)' }} /> Success
          </span>
          <span className="l-item">
            <span className="l-swatch" style={{ background: 'var(--c-error)' }} /> Failed
          </span>
          <span className="l-item">
            <span className="l-swatch" style={{ background: 'var(--c-running)' }} /> Running
          </span>
          <span className="l-item">
            <span className="l-swatch" style={{ background: 'var(--c-neutral)' }} /> Skipped
          </span>
        </div>
      </div>
    </div>
  );
}
