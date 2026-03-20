'use client';

import React, { useState } from 'react';
import { Table, Tag, Button, Space, Popconfirm, Tooltip, message } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { deleteTask, updateTask, triggerTask } from '@/lib/api';
import { BulkActions } from './BulkActions';
import type { Task } from '@/lib/types';

interface TaskTableProps {
  tasks: Task[];
  loading: boolean;
  onEdit: (task: Task) => void;
  onRefresh: () => void;
}

export function TaskTable({ tasks, loading, onEdit, onRefresh }: TaskTableProps) {
  const router = useRouter();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const handleDelete = async (id: string) => {
    try {
      await deleteTask(id);
      message.success('Task deleted');
      onRefresh();
    } catch {
      message.error('Failed to delete task');
    }
  };

  const handleToggle = async (task: Task) => {
    try {
      await updateTask(task.id, { enabled: !task.enabled });
      message.success(task.enabled ? 'Task disabled' : 'Task enabled');
      onRefresh();
    } catch {
      message.error('Failed to update task');
    }
  };

  const handleTrigger = async (id: string) => {
    try {
      await triggerTask(id);
      message.success('Task triggered');
    } catch {
      message.error('Failed to trigger task');
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: Task, b: Task) => a.name.localeCompare(b.name),
    },
    {
      title: 'Schedule',
      dataIndex: 'schedule',
      key: 'schedule',
      className: 'hide-tablet',
      render: (val: string) => <span className="schedule-cell">{val}</span>,
    },
    {
      title: 'Command',
      dataIndex: 'command',
      key: 'command',
      className: 'hide-tablet',
      render: (val: string) => (
        <Tooltip title={val}>
          <span className="command-cell">{val}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 100,
      render: (enabled: boolean) =>
        enabled ? (
          <Tag color="success">Enabled</Tag>
        ) : (
          <Tag color="default">Disabled</Tag>
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_: unknown, record: Task) => (
        <Space size="small">
          <Tooltip title="Trigger now">
            <Button
              type="text"
              icon={<PlayCircleOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleTrigger(record.id);
              }}
              size="small"
            />
          </Tooltip>
          <Tooltip title={record.enabled ? 'Disable' : 'Enable'}>
            <Button
              type="text"
              icon={record.enabled ? <StopOutlined /> : <CheckCircleOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleToggle(record);
              }}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(record);
              }}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title="Delete this task?"
            onConfirm={(e) => {
              e?.stopPropagation();
              handleDelete(record.id);
            }}
            onCancel={(e) => e?.stopPropagation()}
          >
            <Tooltip title="Delete">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={(e) => e.stopPropagation()}
                size="small"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <BulkActions
        selectedIds={selectedRowKeys as string[]}
        onComplete={() => {
          setSelectedRowKeys([]);
          onRefresh();
        }}
      />
      <Table
        dataSource={tasks}
        columns={columns}
        rowKey="id"
        loading={loading}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        onRow={(record) => ({
          onClick: () => router.push(`/tasks?id=${record.id}`),
          style: { cursor: 'pointer' },
        })}
        pagination={{ pageSize: 20, showSizeChanger: true }}
        size="middle"
      />
    </>
  );
}
