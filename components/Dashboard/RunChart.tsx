'use client';

import React, { useMemo } from 'react';
import { Card, Skeleton, Typography } from 'antd';
import dynamic from 'next/dynamic';
import { useRuns } from '@/hooks/useRuns';
import type { JobRun } from '@/lib/types';

const Column = dynamic(
  () => import('@ant-design/charts').then((mod) => mod.Column),
  { ssr: false, loading: () => <Skeleton active paragraph={{ rows: 6 }} /> }
);

function aggregateByDay(runs: JobRun[]) {
  const days: Record<string, { success: number; failed: number }> = {};

  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days[key] = { success: 0, failed: 0 };
  }

  for (const run of runs) {
    const day = run.started_at.slice(0, 10);
    if (days[day]) {
      if (run.status === 'success') {
        days[day].success += 1;
      } else if (run.status !== 'running' && run.status !== 'skipped') {
        days[day].failed += 1;
      }
    }
  }

  const result: { date: string; count: number; type: string }[] = [];
  for (const [date, counts] of Object.entries(days)) {
    result.push({ date, count: counts.success, type: 'Success' });
    result.push({ date, count: counts.failed, type: 'Failed' });
  }

  return result;
}

export function RunChart() {
  const { runs, isLoading, isError } = useRuns({ limit: 1000, since: '7d' });

  const chartData = useMemo(() => aggregateByDay(runs), [runs]);

  if (isLoading) {
    return (
      <Card title="Run Activity (7 days)">
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    );
  }

  if (isError) {
    return (
      <Card title="Run Activity (7 days)">
        <Typography.Text type="secondary">Chart unavailable</Typography.Text>
      </Card>
    );
  }

  if (runs.length === 0) {
    return (
      <Card title="Run Activity (7 days)">
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Typography.Text type="secondary">No runs yet</Typography.Text>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Run Activity (7 days)">
      <Column
        data={chartData}
        xField="date"
        yField="count"
        colorField="type"
        stack
        color={['#52c41a', '#ff4d4f']}
        height={250}
        axis={{
          y: { title: 'Runs' },
          x: { title: null },
        }}
      />
    </Card>
  );
}
