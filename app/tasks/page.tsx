'use client';

import React, { Suspense } from 'react';
import TasksPageContent from './TasksPageContent';
import { Icon } from '@/components/ui/icons';

export default function TasksPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: 80,
            color: 'var(--text-muted)',
          }}
        >
          <Icon.spinner size={22} />
        </div>
      }
    >
      <TasksPageContent />
    </Suspense>
  );
}
