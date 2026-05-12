'use client';

import React, { useMemo } from 'react';
import { useRunSummaries } from '@/hooks/useRuns';
import { buildPulse } from '@/lib/analytics';

export function PulseRail() {
  const since = useMemo(() => new Date(Date.now() - 3600 * 1000).toISOString(), []);
  const { runs } = useRunSummaries({ since });
  const buckets = useMemo(() => buildPulse(runs), [runs]);
  const total = buckets.reduce((a, b) => a + b.success + b.failed + b.running + b.skipped, 0);
  const failed = buckets.reduce((a, b) => a + b.failed, 0);

  return (
    <div className="pulse-rail">
      <span className="pulse-label">60 min</span>
      <div className="pulse-pixels">
        {buckets.map((b, i) => {
          let cls = '';
          if (b.failed > 0 && b.success > 0) cls = 'mixed';
          else if (b.failed > 0) cls = 'failed';
          else if (b.running > 0) cls = 'running';
          else if (b.success > 0) cls = 'success';
          else if (b.skipped > 0) cls = 'skipped';
          const bucketTotal = b.success + b.failed + b.running + b.skipped;
          return (
            <div
              key={i}
              className={`pulse-pixel ${cls}`}
              data-tooltip={
                bucketTotal ? `${bucketTotal} runs · ${60 - i}m ago` : `${60 - i}m ago`
              }
            />
          );
        })}
      </div>
      <span
        className="mono"
        style={{
          color: total
            ? failed > 0
              ? 'var(--c-error)'
              : 'var(--c-success)'
            : 'var(--text-muted)',
        }}
      >
        {total} runs · {failed} failed
      </span>
    </div>
  );
}
