'use client';

import React, { useState } from 'react';
import { Space, Button, Modal, message } from 'antd';
import { DeleteOutlined, CheckCircleOutlined, StopOutlined } from '@ant-design/icons';
import { updateTask, deleteTask } from '@/lib/api';

interface BulkActionsProps {
  selectedIds: string[];
  onComplete: () => void;
}

export function BulkActions({ selectedIds, onComplete }: BulkActionsProps) {
  const [loading, setLoading] = useState(false);

  if (selectedIds.length === 0) return null;

  const handleBulkEnable = async () => {
    setLoading(true);
    try {
      await Promise.all(selectedIds.map((id) => updateTask(id, { enabled: true })));
      message.success(`Enabled ${selectedIds.length} tasks`);
      onComplete();
    } catch {
      message.error('Failed to enable some tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDisable = async () => {
    setLoading(true);
    try {
      await Promise.all(selectedIds.map((id) => updateTask(id, { enabled: false })));
      message.success(`Disabled ${selectedIds.length} tasks`);
      onComplete();
    } catch {
      message.error('Failed to disable some tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = () => {
    Modal.confirm({
      title: `Delete ${selectedIds.length} tasks?`,
      content: 'This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        setLoading(true);
        try {
          await Promise.all(selectedIds.map((id) => deleteTask(id)));
          message.success(`Deleted ${selectedIds.length} tasks`);
          onComplete();
        } catch {
          message.error('Failed to delete some tasks');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  return (
    <Space>
      <span style={{ color: '#8c8c8c' }}>
        {selectedIds.length} selected
      </span>
      <Button
        icon={<CheckCircleOutlined />}
        onClick={handleBulkEnable}
        loading={loading}
        size="small"
      >
        Enable
      </Button>
      <Button
        icon={<StopOutlined />}
        onClick={handleBulkDisable}
        loading={loading}
        size="small"
      >
        Disable
      </Button>
      <Button
        icon={<DeleteOutlined />}
        danger
        onClick={handleBulkDelete}
        loading={loading}
        size="small"
      >
        Delete
      </Button>
    </Space>
  );
}
