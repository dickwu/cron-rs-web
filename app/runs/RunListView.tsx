'use client';

import React, { useState } from 'react';
import { Typography, Card, Select, Space } from 'antd';
import { AppLayout } from '@/components/Layout/AppLayout';
import { RunsTable } from '@/components/Runs/RunsTable';
import { useRuns } from '@/hooks/useRuns';
import { useTasks } from '@/hooks/useTasks';

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'success', label: 'Success' },
  { value: 'failed', label: 'Failed' },
  { value: 'running', label: 'Running' },
  { value: 'retrying', label: 'Retrying' },
  { value: 'timeout', label: 'Timeout' },
  { value: 'skipped', label: 'Skipped' },
  { value: 'crashed', label: 'Crashed' },
];

export default function RunListView() {
  const [taskFilter, setTaskFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { tasks } = useTasks();
  const { runs, isLoading } = useRuns({
    task_id: taskFilter || undefined,
    status: statusFilter || undefined,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  const taskOptions = [
    { value: '', label: 'All Tasks' },
    ...tasks.map((t) => ({ value: t.id, label: t.name })),
  ];

  return (
    <AppLayout>
      <div style={{ marginBottom: 24 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Runs
        </Typography.Title>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            value={taskFilter}
            onChange={(val) => {
              setTaskFilter(val);
              setPage(1);
            }}
            options={taskOptions}
            style={{ minWidth: 200 }}
            placeholder="Filter by task"
            showSearch
            optionFilterProp="label"
          />
          <Select
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
            options={statusOptions}
            style={{ minWidth: 150 }}
            placeholder="Filter by status"
          />
        </Space>
      </Card>

      <RunsTable
        runs={runs}
        loading={isLoading}
        pagination={{
          current: page,
          pageSize,
          total: runs.length < pageSize ? (page - 1) * pageSize + runs.length : page * pageSize + 1,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />
    </AppLayout>
  );
}
