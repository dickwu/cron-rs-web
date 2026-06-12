'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/Layout/AppShell';
import { TasksListView } from '@/components/Tasks/TasksListView';
import { TaskDetailView } from '@/components/Tasks/TaskDetailView';
import { TaskFormDrawer } from '@/components/Tasks/TaskFormDrawer';
import { useSWRConfig } from 'swr';
import { navReplace } from '@/lib/navigation';

export default function TasksPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { mutate } = useSWRConfig();
  const taskId = params.get('id');
  const isNew = params.get('new') === '1';

  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (isNew) setDrawerOpen(true);
  }, [isNew]);

  const closeDrawer = () => {
    setDrawerOpen(false);
    if (isNew) navReplace(router, '/tasks');
  };

  const onSuccess = () => {
    setDrawerOpen(false);
    mutate((key) => typeof key === 'string' && key.startsWith('/api/v1/'));
    navReplace(router, '/tasks');
  };

  const header = taskId
    ? {
        crumbs: [
          { label: 'Tasks', href: '/tasks' },
          { label: taskId },
        ],
      }
    : { crumbs: [{ label: 'Tasks' }] };

  return (
    <AppShell header={header}>
      {taskId ? <TaskDetailView taskId={taskId} /> : <TasksListView />}
      <TaskFormDrawer open={drawerOpen} onClose={closeDrawer} onSuccess={onSuccess} />
    </AppShell>
  );
}
