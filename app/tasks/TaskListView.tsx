'use client';

import React, { useState } from 'react';
import { Typography, Button, Space } from 'antd';
import { PlusOutlined, ScheduleOutlined } from '@ant-design/icons';
import { AppLayout } from '@/components/Layout/AppLayout';
import { TaskTable } from '@/components/Tasks/TaskTable';
import { TaskFormDrawer } from '@/components/Tasks/TaskForm';
import { useTasks } from '@/hooks/useTasks';
import type { Task } from '@/lib/types';

export default function TaskListView() {
  const { tasks, isLoading, mutate } = useTasks();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setDrawerOpen(true);
  };

  const handleCreate = () => {
    setEditingTask(null);
    setDrawerOpen(true);
  };

  const handleSuccess = () => {
    setDrawerOpen(false);
    setEditingTask(null);
    mutate();
  };

  if (!isLoading && tasks.length === 0) {
    return (
      <AppLayout>
        <div className="empty-state">
          <ScheduleOutlined style={{ fontSize: 64, color: '#bfbfbf', marginBottom: 24 }} />
          <h2>No tasks yet</h2>
          <p>Create your first scheduled task to get started.</p>
          <Button type="primary" size="large" icon={<PlusOutlined />} onClick={handleCreate}>
            Create your first scheduled task
          </Button>
          <TaskFormDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            onSuccess={handleSuccess}
            task={editingTask}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={{ marginBottom: 24 }}>
        <Space style={{ width: '100%', justifyContent: 'space-between', display: 'flex' }}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Tasks
          </Typography.Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            New Task
          </Button>
        </Space>
      </div>

      <TaskTable
        tasks={tasks}
        loading={isLoading}
        onEdit={handleEdit}
        onRefresh={() => mutate()}
      />

      <TaskFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={handleSuccess}
        task={editingTask}
      />
    </AppLayout>
  );
}
