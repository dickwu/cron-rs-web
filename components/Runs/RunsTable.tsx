'use client';

import React from 'react';
import { Table, Tooltip } from 'antd';
import { useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/Dashboard/RecentRuns';
import type { JobRun, Task } from '@/lib/types';

interface RunsTableProps {
  runs: JobRun[];
  loading: boolean;
  taskMap?: Record<string, Task>;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
}

export function RunsTable({ runs, loading, taskMap, pagination }: RunsTableProps) {
  const router = useRouter();

  const columns = [
    {
      title: 'Task',
      dataIndex: 'task_id',
      key: 'task_id',
      ellipsis: true,
      render: (taskId: string) => {
        const task = taskMap?.[taskId];
        if (!task) {
          return <span className="mono">{taskId}</span>;
        }
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
      width: 180,
      render: (val: string) => new Date(val).toLocaleString(),
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
      render: (code: number | null) => <span className="mono">{code !== null ? code : '-'}</span>,
    },
    {
      title: 'Attempt',
      dataIndex: 'attempt',
      key: 'attempt',
      width: 80,
    },
  ];

  return (
    <Table
      dataSource={runs}
      columns={columns}
      rowKey="id"
      loading={loading}
      pagination={
        pagination
          ? {
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              onChange: pagination.onChange,
              showSizeChanger: true,
            }
          : { pageSize: 20, showSizeChanger: true }
      }
      size="middle"
      onRow={(record) => ({
        onClick: () => router.push(`/runs?id=${record.id}`),
        style: { cursor: 'pointer' },
      })}
    />
  );
}
