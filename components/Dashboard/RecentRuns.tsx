'use client';

import React, { useMemo } from 'react';
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
import { useRouter } from 'next/navigation';
import { useRuns } from '@/hooks/useRuns';
import { useTasks } from '@/hooks/useTasks';
import { fmtDateTime } from '@/lib/date';
import type { JobRun, Task } from '@/lib/types';

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
  const { runs, isLoading, isError } = useRuns({ limit: 20 });
  const { tasks } = useTasks();
  const taskMap = useMemo<Record<string, Task>>(() => {
    const map: Record<string, Task> = {};
    for (const task of tasks) map[task.id] = task;
    return map;
  }, [tasks]);

  const columns = [
    {
      title: 'Task',
      dataIndex: 'task_id',
      key: 'task_id',
      ellipsis: true,
      width: 200,
      render: (taskId: string) => {
        const task = taskMap[taskId];
        if (!task) return <span className="mono">{taskId}</span>;
        return (
          <Tooltip title={taskId}>
            <span>{task.name}</span>
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

  if (isError) {
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
          onClick: () => router.push(`/runs?id=${record.id}`),
          style: { cursor: 'pointer' },
        })}
      />
    </Card>
  );
}
