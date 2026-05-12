'use client';

import React, { useMemo } from 'react';
import { Card, Empty, Segmented, Skeleton, Space, Tooltip, Typography } from 'antd';
import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { StatusBadge } from '@/components/Dashboard/RecentRuns';
import { useDashboardActivity } from '@/hooks/useDashboard';
import { fmtDateTime } from '@/lib/date';
import { currentPathWithSearch, hrefWithReturnTo } from '@/lib/navigation';
import { useDashboardStore } from '@/stores/dashboardStore';
import type {
  DashboardRange,
  DashboardRunCounts,
  DashboardRunSummary,
  DashboardTaskBreakdown,
} from '@/lib/types';

const Column = dynamic(
  () => import('@ant-design/charts').then((mod) => mod.Column),
  { ssr: false, loading: () => <Skeleton active paragraph={{ rows: 6 }} /> }
);

type Bucket = keyof DashboardRunCounts;

const BUCKET_ORDER: Bucket[] = ['failed', 'skipped', 'running', 'success'];

const BUCKET_LABEL: Record<Bucket, string> = {
  success: 'Success',
  failed: 'Failed',
  skipped: 'Skipped',
  running: 'In flight',
};

const BUCKET_COLOR: Record<Bucket, string> = {
  success: '#52c41a',
  failed: '#ff4d4f',
  skipped: '#bfbfbf',
  running: '#1677ff',
};

const RANGE_OPTIONS: { label: string; value: DashboardRange }[] = [
  { label: '24h', value: '24h' },
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
];

interface ChartDatum {
  label: string;
  count: number;
  type: string;
}

function StackedBar({
  counts,
  total,
}: {
  counts: DashboardRunCounts;
  total: number;
}) {
  if (total === 0) return null;
  return (
    <div
      style={{
        display: 'flex',
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
        background: '#f0f0f0',
        width: '100%',
      }}
    >
      {BUCKET_ORDER.slice()
        .reverse()
        .map((bucket) => {
          const value = counts[bucket];
          if (!value) return null;
          return (
            <Tooltip key={bucket} title={`${BUCKET_LABEL[bucket]}: ${value}`}>
              <div
                style={{
                  width: `${(value / total) * 100}%`,
                  background: BUCKET_COLOR[bucket],
                }}
              />
            </Tooltip>
          );
        })}
    </div>
  );
}

function TopTasks({
  topTasks,
  onSelect,
}: {
  topTasks: DashboardTaskBreakdown[];
  onSelect: (taskId: string) => void;
}) {
  if (topTasks.length === 0) return null;
  return (
    <div style={{ marginTop: 20, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
      <Typography.Text
        type="secondary"
        style={{ fontSize: 12, display: 'block', marginBottom: 10 }}
      >
        Top tasks in this window
      </Typography.Text>
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        {topTasks.map((task) => {
          const label = task.task_name ?? task.task_id.slice(0, 8);
          return (
            <div
              key={task.task_id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(task.task_id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(task.task_id);
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: 'pointer',
                fontSize: 13,
                padding: '4px 0',
              }}
            >
              <Typography.Text
                ellipsis={{ tooltip: task.task_id }}
                style={{ flex: '1 1 0', minWidth: 0 }}
              >
                {label}
              </Typography.Text>
              <div style={{ flex: '0 0 96px' }}>
                <StackedBar counts={task.counts} total={task.total} />
              </div>
              <Typography.Text
                type="secondary"
                style={{ flex: '0 0 64px', fontSize: 12, textAlign: 'right' }}
              >
                {task.total} run{task.total === 1 ? '' : 's'}
              </Typography.Text>
              <div style={{ flex: '0 0 60px', textAlign: 'right' }}>
                {task.counts.failed > 0 ? (
                  <Typography.Text type="danger" style={{ fontSize: 12 }}>
                    {task.counts.failed} fail{task.counts.failed === 1 ? '' : 's'}
                  </Typography.Text>
                ) : null}
              </div>
            </div>
          );
        })}
      </Space>
    </div>
  );
}

function RecentFailures({
  failedRuns,
  onSelect,
}: {
  failedRuns: DashboardRunSummary[];
  onSelect: (runId: string) => void;
}) {
  if (failedRuns.length === 0) return null;
  return (
    <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
      <Typography.Text
        type="secondary"
        style={{ fontSize: 12, display: 'block', marginBottom: 10 }}
      >
        Recent failures
      </Typography.Text>
      <Space direction="vertical" size={6} style={{ width: '100%' }}>
        {failedRuns.map((run) => {
          const label = run.task_name ?? run.task_id.slice(0, 8);
          return (
            <div
              key={run.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(run.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(run.id);
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: 'pointer',
                fontSize: 13,
                padding: '4px 0',
              }}
            >
              <Typography.Text
                ellipsis={{ tooltip: run.task_id }}
                style={{ flex: '1 1 0', minWidth: 0 }}
              >
                {label}
              </Typography.Text>
              <div style={{ flex: '0 0 auto' }}>
                <StatusBadge status={run.status} />
              </div>
              <Typography.Text type="secondary" style={{ flex: '0 0 auto', fontSize: 12 }}>
                {fmtDateTime(run.started_at)}
              </Typography.Text>
              <Typography.Text
                type="secondary"
                className="mono"
                style={{ flex: '0 0 36px', fontSize: 12, textAlign: 'right' }}
              >
                {run.exit_code !== null ? run.exit_code : '-'}
              </Typography.Text>
            </div>
          );
        })}
      </Space>
    </div>
  );
}

export function RunChart() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const range = useDashboardStore((state) => state.range);
  const setRange = useDashboardStore((state) => state.setRange);
  const { activity, isLoading, isError } = useDashboardActivity(range);

  const chartData = useMemo<ChartDatum[]>(() => {
    if (!activity) return [];
    return activity.buckets.flatMap((bucket) =>
      BUCKET_ORDER.map((type) => ({
        label: bucket.label,
        count: bucket.counts[type],
        type: BUCKET_LABEL[type],
      }))
    );
  }, [activity]);

  const total = activity?.total ?? 0;
  const failed = activity?.failed ?? 0;
  const successRate = activity?.success_rate ?? null;
  const summary =
    isLoading || isError || !activity ? null : (
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {total} run{total === 1 ? '' : 's'}
        {successRate !== null && (
          <>
            {' · '}
            <span
              style={{
                color:
                  failed === 0
                    ? '#52c41a'
                    : successRate >= 90
                      ? '#faad14'
                      : '#ff4d4f',
              }}
            >
              {successRate.toFixed(1)}% success
            </span>
          </>
        )}
      </Typography.Text>
    );

  const header = (
    <Space
      size={[12, 8]}
      style={{
        width: '100%',
        justifyContent: 'space-between',
        display: 'flex',
        flexWrap: 'wrap',
      }}
    >
      <Typography.Text strong>Run Activity</Typography.Text>
      <Space size={12} wrap>
        {summary}
        <Segmented
          size="small"
          value={range}
          onChange={(value) => setRange(value as DashboardRange)}
          options={RANGE_OPTIONS}
        />
      </Space>
    </Space>
  );

  if (isLoading) {
    return (
      <Card title={header}>
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    );
  }

  if (isError && !activity) {
    return (
      <Card title={header}>
        <Typography.Text type="secondary">Chart unavailable</Typography.Text>
      </Card>
    );
  }

  const returnTo = currentPathWithSearch(pathname, searchParams);

  return (
    <Card title={header}>
      {total === 0 ? (
        <Empty description="No runs in this window" style={{ padding: '24px 0' }} />
      ) : (
        <Column
          data={chartData}
          xField="label"
          yField="count"
          colorField="type"
          stack
          scale={{
            color: {
              domain: BUCKET_ORDER.map((bucket) => BUCKET_LABEL[bucket]),
              range: BUCKET_ORDER.map((bucket) => BUCKET_COLOR[bucket]),
            },
            x: { paddingInner: 0.25 },
          }}
          height={240}
          axis={{
            y: { title: null, tickCount: 4 },
            x: { title: null },
          }}
          legend={{
            color: { position: 'top', layout: { justifyContent: 'flex-end' } },
          }}
          tooltip={{
            title: (datum: ChartDatum) => datum.label,
            items: [{ channel: 'y', valueFormatter: (value: number) => String(value) }],
          }}
          interaction={{
            tooltip: { shared: true },
            elementHighlight: { background: true },
          }}
        />
      )}
      <TopTasks
        topTasks={activity?.top_tasks ?? []}
        onSelect={(taskId) => router.push(hrefWithReturnTo(`/tasks?id=${taskId}`, returnTo))}
      />
      <RecentFailures
        failedRuns={activity?.failed_runs ?? []}
        onSelect={(runId) => router.push(hrefWithReturnTo(`/runs?id=${runId}`, returnTo))}
      />
    </Card>
  );
}
