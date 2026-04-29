'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/Layout/AppLayout';
import { useTasks } from '@/hooks/useTasks';
import { swrFetcher } from '@/lib/api';
import { hookTypeLabels } from '@/lib/hooks';
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  Skeleton,
  Space,
  Tag,
  Table,
  Typography,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import useSWR from 'swr';
import type { Hook } from '@/lib/types';

export default function HookListView() {
  const router = useRouter();
  const { tasks, isLoading, isError } = useTasks();
  const { data: hooks, error: hooksError, isLoading: hooksLoading } = useSWR<Hook[]>(
    '/api/v1/hooks',
    swrFetcher,
    { revalidateOnFocus: false }
  );
  const [query, setQuery] = useState('');

  const tasksById = new Map(tasks.map((task) => [task.id, task]));

  const normalizedQuery = query.trim().toLowerCase();
  const visibleHooks = (hooks || [])
    .filter((hook) => {
      const task = hook.task_id ? tasksById.get(hook.task_id) : undefined;
      const typeLabel = hookTypeLabels[hook.hook_type].label;

      if (!normalizedQuery) return true;

      return [
        hook.command,
        hook.task_id,
        hook.hook_type,
        typeLabel,
        task?.name,
        task?.schedule,
        task?.description,
        ...(task?.tags || []),
      ].some((value) => value && value.toLowerCase().includes(normalizedQuery));
    })
    .sort((left, right) => {
      const leftTask = left.task_id ? tasksById.get(left.task_id)?.name || left.task_id : 'Global';
      const rightTask =
        right.task_id ? tasksById.get(right.task_id)?.name || right.task_id : 'Global';
      return leftTask.localeCompare(rightTask) || left.run_order - right.run_order;
    });

  const columns = [
    {
      title: 'Task',
      key: 'task',
      render: (_: unknown, hook: Hook) => {
        if (!hook.task_id) {
          return (
            <Space direction="vertical" size={0}>
              <Typography.Text strong>Global</Typography.Text>
              <Typography.Text type="secondary">Settings</Typography.Text>
            </Space>
          );
        }

        const task = tasksById.get(hook.task_id);

        return (
          <Space direction="vertical" size={0}>
            <Typography.Text strong>{task?.name || hook.task_id}</Typography.Text>
            <Typography.Text type="secondary" className="mono">
              {hook.task_id}
            </Typography.Text>
          </Space>
        );
      },
    },
    {
      title: 'Type',
      dataIndex: 'hook_type',
      key: 'hook_type',
      width: 180,
      render: (type: Hook['hook_type']) => {
        const config = hookTypeLabels[type];
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: 'Command',
      dataIndex: 'command',
      key: 'command',
      render: (value: string) => <span className="command-cell">{value}</span>,
    },
    {
      title: 'Timeout',
      dataIndex: 'timeout_secs',
      key: 'timeout_secs',
      width: 100,
      render: (value: number | null) => (value ? `${value}s` : 'Default'),
    },
    {
      title: 'Order',
      dataIndex: 'run_order',
      key: 'run_order',
      width: 80,
    },
  ];

  if (isLoading || hooksLoading) {
    return (
      <AppLayout>
        <Skeleton active paragraph={{ rows: 10 }} />
      </AppLayout>
    );
  }

  if (isError || hooksError) {
    return (
      <AppLayout>
        <Alert
          type="error"
          showIcon
          message="Could not load hooks"
        />
      </AppLayout>
    );
  }

  if (tasks.length === 0 && (hooks?.length ?? 0) === 0) {
    return (
      <AppLayout>
        <div className="empty-state">
          <h2>No tasks available</h2>
          <p>Create a task first, then attach success, failure, or retry hooks to it.</p>
          <Button type="primary" onClick={() => router.push('/tasks')}>
            Go to Tasks
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={{ marginBottom: 24 }}>
        <Space
          style={{ width: '100%', justifyContent: 'space-between', display: 'flex' }}
          wrap
        >
          <div>
            <Typography.Title level={3} style={{ margin: 0 }}>
              Hooks
            </Typography.Title>
            <Typography.Text type="secondary">
              Browse configured hooks. Open a task detail page to add, edit, or delete them.
            </Typography.Text>
          </div>
          <Input
            allowClear
            placeholder="Search hooks"
            prefix={<SearchOutlined />}
            style={{ maxWidth: 320 }}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </Space>
      </div>

      {visibleHooks.length === 0 ? (
        <Card>
          <Empty
            description={
              hooks && hooks.length > 0
                ? 'No hooks match the current filter'
                : 'No hooks configured yet'
            }
          />
        </Card>
      ) : (
        <Card>
          <Table
            dataSource={visibleHooks}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 20, showSizeChanger: true }}
            onRow={(hook) => ({
              onClick: () => router.push(hook.task_id ? `/tasks?id=${hook.task_id}` : '/settings'),
              style: { cursor: 'pointer' },
            })}
          />
        </Card>
      )}
    </AppLayout>
  );
}
