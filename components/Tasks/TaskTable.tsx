'use client';

import React, { useEffect, useState } from 'react';
import { Table, Tag, Button, Space, Popconfirm, Tooltip, message } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { deleteTask, enableTask, disableTask, triggerTask } from '@/lib/api';
import { BulkActions } from './BulkActions';
import { describeSchedule } from '@/lib/schedule';
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(tasks.length / pageSize));

    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [page, pageSize, tasks.length]);

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
      if (task.enabled) {
        await disableTask(task.id);
        message.success('Task disabled');
      } else {
        await enableTask(task.id);
        message.success('Task enabled');
      }
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
      render: (val: string) => {
        const schedule = describeSchedule(val);
        return (
          <Tooltip title={schedule.detail}>
            <span className="schedule-cell">
              <span>{schedule.summary}</span>
              <span className="schedule-expression">{val}</span>
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: 'Tags',
      dataIndex: 'tags',
      key: 'tags',
      width: 180,
      render: (tags: string[]) => (
        <Space size={[0, 4]} wrap>
          {(tags || []).map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </Space>
      ),
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
        pagination={{
          current: page,
          pageSize,
          total: tasks.length,
          showSizeChanger: true,
          onChange: (nextPage, nextPageSize) => {
            setPage(nextPage);
            setPageSize(nextPageSize);
          },
        }}
        size="middle"
      />
    </>
  );
}
