'use client';

import React from 'react';
import { Card, Table, Tag, Tooltip, Typography, Skeleton } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  MinusCircleOutlined,
  WarningOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDashboardRecentRuns } from '@/hooks/useDashboard';
import { fmtDateTime } from '@/lib/date';
import { currentPathWithSearch, hrefWithReturnTo } from '@/lib/navigation';
import type { DashboardRunSummary, JobRun } from '@/lib/types';

const statusConfig: Record<
  JobRun['status'],
  { color: string; icon: React.ReactNode; label: string }
> = {
  success: { color: 'success', icon: <CheckCircleOutlined />, label: 'Success' },
  failed: { color: 'error', icon: <CloseCircleOutlined />, label: 'Failed' },
  running: { color: 'processing', icon: <SyncOutlined spin />, label: 'Running' },
  retrying: { color: 'warning', icon: <ReloadOutlined />, label: 'Retrying' },
  timeout: { color: 'error', icon: <ClockCircleOutlined />, label: 'Timeout' },
  skipped: { color: 'default', icon: <MinusCircleOutlined />, label: 'Skipped' },
  crashed: { color: 'error', icon: <WarningOutlined />, label: 'Crashed' },
};

function StatusBadge({ status }: { status: JobRun['status'] }) {
  const config = statusConfig[status] || statusConfig.failed;
  return (
    <Tag color={config.color} icon={config.icon}>
      {config.label}
    </Tag>
  );
}

export { StatusBadge };

export function RecentRuns() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { runs, isLoading, isError } = useDashboardRecentRuns(20);
  const returnTo = currentPathWithSearch(pathname, searchParams);

  const columns = [
    {
      title: 'Task',
      key: 'task_id',
      ellipsis: true,
      width: 200,
      render: (_: unknown, run: DashboardRunSummary) => {
        if (!run.task_name) return <span className="mono">{run.task_id}</span>;
        return (
          <Tooltip title={run.task_id}>
            <span>{run.task_name}</span>
          </Tooltip>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: JobRun['status']) => <StatusBadge status={status} />,
    },
    {
      title: 'Started',
      dataIndex: 'started_at',
      key: 'started_at',
      width: 140,
      render: (val: string) => fmtDateTime(val),
    },
    {
      title: 'Duration',
      dataIndex: 'duration_ms',
      key: 'duration_ms',
      width: 100,
      render: (ms: number | null) => {
        if (ms === null) return '-';
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(1)}s`;
      },
    },
    {
      title: 'Exit',
      dataIndex: 'exit_code',
      key: 'exit_code',
      width: 60,
      render: (code: number | null) => (
        <span className="mono">{code !== null ? code : '-'}</span>
      ),
    },
  ];

  if (isLoading) {
    return (
      <Card title="Recent Runs">
        <Skeleton active paragraph={{ rows: 5 }} />
      </Card>
    );
  }

  if (isError && runs.length === 0) {
    return (
      <Card title="Recent Runs">
        <Typography.Text type="danger">Could not load recent runs</Typography.Text>
      </Card>
    );
  }

  if (runs.length === 0) {
    return (
      <Card title="Recent Runs">
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Typography.Text type="secondary">No runs yet</Typography.Text>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Recent Runs" aria-live="polite">
      <Table
        dataSource={runs}
        columns={columns}
        rowKey="id"
        pagination={false}
        size="small"
        onRow={(record) => ({
          onClick: () => router.push(hrefWithReturnTo(`/runs?id=${record.id}`, returnTo)),
          style: { cursor: 'pointer' },
        })}
      />
    </Card>
  );
}
