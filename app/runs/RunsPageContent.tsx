'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/Layout/AppShell';
import { RunsListView } from '@/components/Runs/RunsListView';
import { RunDetailView } from '@/components/Runs/RunDetailView';

export default function RunsPageContent() {
  const params = useSearchParams();
  const runId = params.get('id');

  const header = runId
    ? { crumbs: [{ label: 'Runs', href: '/runs' }, { label: runId }] }
    : { crumbs: [{ label: 'Runs' }] };

  return (
    <AppShell header={header}>
      {runId ? <RunDetailView runId={runId} /> : <RunsListView />}
    </AppShell>
  );
}
