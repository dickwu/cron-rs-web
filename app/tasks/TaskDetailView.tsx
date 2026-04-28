'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Typography,
  Card,
  Descriptions,
  Tag,
  Button,
  Space,
  Skeleton,
  Popconfirm,
  message,
  Divider,
  Table,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { AppLayout } from '@/components/Layout/AppLayout';
import { TaskFormDrawer } from '@/components/Tasks/TaskForm';
import { HookTable } from '@/components/Hooks/HookTable';
import { StatusBadge } from '@/components/Dashboard/RecentRuns';
import { useTask } from '@/hooks/useTasks';
import { useRuns } from '@/hooks/useRuns';
import { deleteTask, triggerTask } from '@/lib/api';
import { describeSchedule } from '@/lib/schedule';
import type { JobRun } from '@/lib/types';

interface TaskDetailViewProps {
  taskId: string;
}

export default function TaskDetailView({ taskId }: TaskDetailViewProps) {
  const router = useRouter();
  const { task, isLoading, mutate } = useTask(taskId);
  const { runs, isLoading: runsLoading } = useRuns({ task_id: taskId, limit: 50 });
  const [editOpen, setEditOpen] = useState(false);

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.replace('/tasks');
  };

  const handleDelete = async () => {
    try {
      await deleteTask(taskId);
      message.success('Task deleted');
      router.push('/tasks');
    } catch {
      message.error('Failed to delete task');
    }
  };

  const handleTrigger = async () => {
    try {
      await triggerTask(taskId);
      message.success('Task triggered');
    } catch {
      message.error('Failed to trigger task');
    }
  };

  const runColumns = [
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

  if (isLoading) {
    return (
      <AppLayout>
        <Skeleton active paragraph={{ rows: 8 }} />
      </AppLayout>
    );
  }

  if (!task) {
    return (
      <AppLayout>
        <Typography.Text type="danger">Task not found</Typography.Text>
      </AppLayout>
    );
  }

  const schedule = describeSchedule(task.schedule);

  return (
    <AppLayout>
      <div style={{ marginBottom: 24 }}>
        <Space style={{ width: '100%', justifyContent: 'space-between', display: 'flex' }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={handleBack} />
            <Typography.Title level={3} style={{ margin: 0 }}>
              {task.name}
            </Typography.Title>
            {task.enabled ? (
              <Tag color="success">Enabled</Tag>
            ) : (
              <Tag color="default">Disabled</Tag>
            )}
          </Space>
          <Space>
            <Button icon={<PlayCircleOutlined />} onClick={handleTrigger}>
              Trigger
            </Button>
            <Button icon={<EditOutlined />} onClick={() => setEditOpen(true)}>
              Edit
            </Button>
            <Popconfirm title="Delete this task?" onConfirm={handleDelete}>
              <Button danger icon={<DeleteOutlined />}>
                Delete
              </Button>
            </Popconfirm>
          </Space>
        </Space>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2, lg: 3 }}>
          <Descriptions.Item label="Command">
            <span className="mono">{task.command}</span>
          </Descriptions.Item>
          <Descriptions.Item label="Schedule">
            <Space direction="vertical" size={0}>
              <span>{schedule.summary}</span>
              <Typography.Text type="secondary" className="mono">
                {task.schedule}
              </Typography.Text>
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="Tags">
            <Space size={[0, 4]} wrap>
              {(task.tags || []).map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="Concurrency">{task.concurrency_policy}</Descriptions.Item>
          <Descriptions.Item label="Max Retries">{task.max_retries}</Descriptions.Item>
          <Descriptions.Item label="Retry Delay">{task.retry_delay_secs}s</Descriptions.Item>
          <Descriptions.Item label="Timeout">
            {task.timeout_secs ? `${task.timeout_secs}s` : 'None'}
          </Descriptions.Item>
          {task.description && (
            <Descriptions.Item label="Description" span={3}>
              {task.description}
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Created">
            {new Date(task.created_at).toLocaleString()}
          </Descriptions.Item>
          <Descriptions.Item label="Updated">
            {new Date(task.updated_at).toLocaleString()}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Hook Settings" style={{ marginBottom: 16 }}>
        <HookTable taskId={taskId} />
      </Card>

      <Divider />

      <Card title="Run History">
        <Table
          dataSource={runs}
          columns={runColumns}
          rowKey="id"
          loading={runsLoading}
          pagination={{ pageSize: 10 }}
          size="small"
          onRow={(record) => ({
            onClick: () => router.push(`/runs?id=${record.id}`),
            style: { cursor: 'pointer' },
          })}
        />
      </Card>

      <TaskFormDrawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={() => {
          setEditOpen(false);
          mutate();
        }}
        task={task}
      />
    </AppLayout>
  );
}
