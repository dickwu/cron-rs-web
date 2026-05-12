'use client';

import React from 'react';
import { Icon } from '@/components/ui/icons';
import { toast } from '@/components/ui/Toaster';

export function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">No tasks yet</div>
        </div>
      </div>
      <div className="empty">
        <div className="empty-icon">
          <Icon.calendar size={32} />
        </div>
        <h2>Welcome to cron-rs</h2>
        <p>
          You haven&apos;t set up any scheduled tasks yet. Create your first task, or import
          existing crontab and systemd timers from this host.
        </p>
        <div className="flex gap-2">
          <button className="btn primary" onClick={onCreate}>
            <Icon.plus size={13} /> Create your first task
          </button>
          <button
            className="btn"
            onClick={() => toast('Import not implemented yet', 'info')}
          >
            <Icon.download size={13} /> Import from crontab
          </button>
        </div>
        <div
          className="mt-6 muted fz-12 mono"
          style={{
            maxWidth: 480,
            textAlign: 'left',
            padding: 12,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 6,
          }}
        >
          $ cron-rs task create my-backup \
          <br />
          {'  '}--command &quot;/usr/local/bin/backup.sh&quot; \<br />
          {'  '}--schedule &quot;*-*-* 02:00:00&quot;
        </div>
      </div>
    </>
  );
}
