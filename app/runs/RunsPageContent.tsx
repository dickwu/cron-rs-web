'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import RunListView from './RunListView';
import RunDetailViewPage from './RunDetailViewPage';

export default function RunsPageContent() {
  const searchParams = useSearchParams();
  const runId = searchParams.get('id');

  if (runId) {
    return <RunDetailViewPage runId={runId} />;
  }

  return <RunListView />;
}
