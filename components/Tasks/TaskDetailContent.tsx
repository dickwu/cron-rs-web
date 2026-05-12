'use client';

import React, { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { TaskFormDrawer } from '@/components/Tasks/TaskForm';
import { HookTable } from '@/components/Hooks/HookTable';
import { StatusBadge } from '@/components/Dashboard/RecentRuns';
import { useTask } from '@/hooks/useTasks';
import { useRunSummaries } from '@/hooks/useRuns';
import { deleteTask, triggerTask, enableTask, disableTask } from '@/lib/api';
import { describeSchedule } from '@/lib/schedule';
import { fmtDateTime } from '@/lib/date';
import { currentPathWithSearch, hrefWithReturnTo, returnToOrFallback } from '@/lib/navigation';
import type { JobRun } from '@/lib/types';

interface TaskDetailContentProps {
  taskId: string;
  /** Hide the Run History section (useful in modal contexts where runs would create navigation loops). */
  hideRuns?: boolean;
  /** Called after successful delete. Defaults to navigating to /tasks. */
  onDeleted?: () => void;
  /** Called when a run row is clicked. Defaults to navigating to /runs?id=. */
  onRunClick?: (runId: string) => void;
}

export function TaskDetailContent({
  taskId,
  hideRuns = false,
  onDeleted,
  onRunClick,
}: TaskDetailContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const returnTo = currentPathWithSearch(pathname, searchParams);
  const { task, isLoading, mutate } = useTask(taskId);
  const { runs, isLoading: runsLoading } = useRunSummaries({ task_id: taskId, limit: 50 });
  const [editOpen, setEditOpen] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteTask(taskId);
      message.success('Task deleted');
      if (onDeleted) {
        onDeleted();
      } else {
        router.replace(returnToOrFallback(searchParams, '/tasks'));
      }
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

  const handleToggle = async () => {
    if (!task) return;
    try {
      if (task.enabled) {
        await disableTask(taskId);
        message.success('Task disabled');
      } else {
        await enableTask(taskId);
        message.success('Task enabled');
      }
      mutate();
    } catch {
      message.error(`Failed to ${task.enabled ? 'disable' : 'enable'} task`);
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
    return <Skeleton active paragraph={{ rows: 8 }} />;
  }

  if (!task) {
    return <Typography.Text type="danger">Task not found</Typography.Text>;
  }

  const schedule = describeSchedule(task.schedule);

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Space style={{ width: '100%', justifyContent: 'space-between', display: 'flex' }} wrap>
          <Space wrap>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {task.name}
            </Typography.Title>
            {task.enabled ? (
              <Tag color="success">Enabled</Tag>
            ) : (
              <Tag color="default">Disabled</Tag>
            )}
          </Space>
          <Space wrap>
            <Button icon={<PlayCircleOutlined />} onClick={handleTrigger}>
              Trigger
            </Button>
            <Button
              icon={task.enabled ? <StopOutlined /> : <CheckCircleOutlined />}
              onClick={handleToggle}
            >
              {task.enabled ? 'Disable' : 'Enable'}
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
          <Descriptions.Item label="Lock Key">{task.lock_key || 'None'}</Descriptions.Item>
          <Descriptions.Item label="Sandbox">
            {task.sandbox_profile || 'None'}
          </Descriptions.Item>
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
            {fmtDateTime(task.created_at)}
          </Descriptions.Item>
          <Descriptions.Item label="Updated">
            {fmtDateTime(task.updated_at)}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Hook Settings" style={{ marginBottom: 16 }}>
        <HookTable taskId={taskId} />
      </Card>

      {!hideRuns && (
        <>
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
                onClick: () => {
                  if (onRunClick) onRunClick(record.id);
                  else router.push(hrefWithReturnTo(`/runs?id=${record.id}`, returnTo));
                },
                style: { cursor: 'pointer' },
              })}
            />
          </Card>
        </>
      )}

      <TaskFormDrawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={() => {
          setEditOpen(false);
          mutate();
        }}
        task={task}
      />
    </>
  );
}
