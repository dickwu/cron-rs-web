'use client';

import React from 'react';

export interface Crumb {
  label: React.ReactNode;
  href?: string;
  onClick?: () => void;
}

type SseState = 'connected' | 'connecting' | 'disconnected';

export function Topbar({
  breadcrumb,
  sse,
  actions,
}: {
  breadcrumb: Crumb[];
  sse: SseState;
  actions?: React.ReactNode;
}) {
  return (
    <div className="topbar">
      <div className="topbar-breadcrumb">
        {breadcrumb.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="crumb-sep">/</span>}
            {c.onClick ? (
              <button
                className="btn ghost sm"
                style={{ padding: 0, height: 'auto', fontWeight: 400 }}
                onClick={c.onClick}
              >
                {c.label}
              </button>
            ) : (
              <span className={i === breadcrumb.length - 1 ? 'crumb-current' : ''}>
                {c.label}
              </span>
            )}
          </React.Fragment>
        ))}
      </div>
      <div className="topbar-actions">
        <span className="sse-pill">
          <span className={`sse-dot ${sse}`} />
          {sse === 'connected' ? 'Live' : sse === 'connecting' ? 'Connecting' : 'Disconnected'}
        </span>
        {actions}
      </div>
    </div>
  );
}
