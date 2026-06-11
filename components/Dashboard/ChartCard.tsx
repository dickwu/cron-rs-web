'use client';

import React, { useMemo, useState } from 'react';
import { StackedChart, type ChartBucket as RenderedBucket } from '@/components/ui/StackedChart';
import { useDashboardActivity } from '@/hooks/useDashboard';
import type { DashboardBucket, DashboardRange } from '@/lib/types';

type ChartMode = 'bars' | 'lines' | 'heatmap';

/** Hourly buckets arrive keyed by UTC hour; show them in the local zone.
 *  Daily buckets are UTC calendar days and keep their date label as-is. */
function bucketLabel(bucket: DashboardBucket, range: DashboardRange): string {
  if (range === '24h') {
    const local = new Date(`${bucket.bucket_start}:00:00Z`);
    return `${String(local.getHours()).padStart(2, '0')}:00`;
  }
  const [, month, day] = bucket.bucket_start.split('-');
  return `${Number(month)}/${Number(day)}`;
}

export function ChartCard() {
  const [range, setRange] = useState<DashboardRange>('24h');
  const [mode, setMode] = useState<ChartMode>('bars');
  const { activity } = useDashboardActivity(range);

  const buckets = useMemo<RenderedBucket[]>(
    () =>
      (activity?.buckets ?? []).map((b) => ({
        label: bucketLabel(b, range),
        success: b.counts.success,
        failed: b.counts.failed,
        skipped: b.counts.skipped,
        running: b.counts.running,
      })),
    [activity, range],
  );

  const total = activity?.total ?? 0;
  const failed = activity?.failed ?? 0;
  const successRate = activity?.success_rate ?? null;

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title">Run activity</div>
          <div className="card-sub">
            <span className="mono">{total.toLocaleString('en-US')}</span> runs ·{' '}
            <span
              className="mono"
              style={{
                color:
                  failed === 0
                    ? 'var(--c-success)'
                    : (successRate ?? 0) >= 90
                    ? 'var(--c-warning)'
                    : 'var(--c-error)',
              }}
            >
              {successRate === null ? '—' : `${successRate.toFixed(1)}% success`}
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
