import React from 'react';

export type PillStatus =
  | 'success'
  | 'failed'
  | 'running'
  | 'retrying'
  | 'timeout'
  | 'skipped'
  | 'crashed'
  | 'enabled'
  | 'disabled';

const LABELS: Record<PillStatus, string> = {
  success: 'Success',
  failed: 'Failed',
  running: 'Running',
  retrying: 'Retrying',
  timeout: 'Timeout',
  skipped: 'Skipped',
  crashed: 'Crashed',
  enabled: 'Enabled',
  disabled: 'Disabled',
};

export function StatusPill({
  status,
  size,
}: {
  status: PillStatus | string;
  size?: 'sm';
}) {
  const styleSm: React.CSSProperties | undefined =
    size === 'sm' ? { fontSize: 10, padding: '1px 6px' } : undefined;
  return (
    <span className={`status-pill ${status}`} style={styleSm}>
      <span className="dot" />
      {LABELS[status as PillStatus] || status}
    </span>
  );
}
