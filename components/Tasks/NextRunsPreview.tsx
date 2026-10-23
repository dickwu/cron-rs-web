'use client';

import React from 'react';
import { useSchedulePreview } from '@/hooks/useSchedule';
import { fmtInZone, relTimeFuture } from '@/lib/date';

/**
 * "Next N runs" list. Times come from the daemon's schedule preview endpoint
 * when available (falling back to a client-side evaluation) and are shown as
 * wall-clock time in the server's timezone, which is where systemd fires them.
 */
export function NextRunsPreview({
  schedule,
  count = 5,
  framed = true,
}: {
  schedule: string;
  count?: number;
  framed?: boolean;
}) {
  const preview = useSchedulePreview(schedule, count);

  const body = (
    <>
      {preview.isLoading && <div className="muted">Computing…</div>}
      {!preview.isLoading && preview.error && (
        <div style={{ color: 'var(--c-error)' }}>{preview.error}</div>
      )}
      {!preview.isLoading && !preview.error && preview.runs.length === 0 && (
        <div className="muted">—</div>
      )}
      {preview.runs.map((d, i) => (
        <div
          key={i}
          style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', gap: 12 }}
        >
          <span style={{ color: 'var(--text-secondary)' }}>
            {fmtInZone(d, 'ddd, MMM D · HH:mm:ss', preview.timeZone)}
          </span>
          <span className="muted">{relTimeFuture(d)}</span>
        </div>
      ))}
    </>
  );

  const footer = (
    <div className="fz-11 muted" style={{ marginTop: 6 }}>
      {preview.serverTimeZoneKnown
        ? `Server time (${preview.timeZone})`
        : `Browser time (${preview.timeZone}) — server timezone unknown`}
      {preview.source === 'client' && ' · estimated locally'}
    </div>
  );

  if (!framed) {
    return (
      <div className="mono fz-12">
        {body}
        {footer}
      </div>
    );
  }

  return (
    <>
      <div
        className="mono fz-12"
        style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: 12,
        }}
      >
        {body}
      </div>
      {footer}
    </>
  );
}
