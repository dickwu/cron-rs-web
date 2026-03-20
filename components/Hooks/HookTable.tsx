'use client';

import React, { useState } from 'react';
import { Table, Tag, Button, Popconfirm, message, Space } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import useSWR from 'swr';
import { swrFetcher, deleteHook } from '@/lib/api';
import { HookForm } from './HookForm';
import type { Hook } from '@/lib/types';

interface HookTableProps {
  taskId: string;
}

const hookTypeLabels: Record<Hook['hook_type'], { label: string; color: string }> = {
  on_failure: { label: 'On Failure', color: 'error' },
  on_success: { label: 'On Success', color: 'success' },
  on_retry_exhausted: { label: 'On Retry Exhausted', color: 'warning' },
};

export function HookTable({ taskId }: HookTableProps) {
  const { data: hooks, isLoading, mutate } = useSWR<Hook[]>(
    `/api/v1/tasks/${taskId}/hooks`,
    swrFetcher,
    { revalidateOnFocus: false }
  );
  const [formOpen, setFormOpen] = useState(false);

  const handleDelete = async (hookId: string) => {
    try {
      await deleteHook(taskId, hookId);
      message.success('Hook deleted');
      mutate();
    } catch {
      message.error('Failed to delete hook');
    }
  };

  const columns = [
    {
      title: 'Type',
      dataIndex: 'hook_type',
      key: 'hook_type',
      width: 160,
      render: (type: Hook['hook_type']) => {
        const config = hookTypeLabels[type];
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: 'Command',
      dataIndex: 'command',
      key: 'command',
      render: (val: string) => <span className="command-cell">{val}</span>,
    },
    {
      title: 'Timeout',
      dataIndex: 'timeout_secs',
      key: 'timeout_secs',
      width: 100,
      render: (val: number) => `${val}s`,
    },
    {
      title: 'Order',
      dataIndex: 'run_order',
      key: 'run_order',
      width: 80,
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      render: (_: unknown, record: Hook) => (
        <Popconfirm title="Delete this hook?" onConfirm={() => handleDelete(record.id)}>
          <Button type="text" danger icon={<DeleteOutlined />} size="small" />
        </Popconfirm>
      ),
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} size="small" onClick={() => setFormOpen(true)}>
          Add Hook
        </Button>
      </Space>
      <Table
        dataSource={hooks || []}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        size="small"
      />
      <HookForm
        open={formOpen}
        taskId={taskId}
        onClose={() => setFormOpen(false)}
        onSuccess={() => {
          setFormOpen(false);
          mutate();
        }}
      />
    </>
  );
}
