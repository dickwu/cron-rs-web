'use client';

import React, { useMemo, useState } from 'react';
import { Typography, Button, Space, Tag } from 'antd';
import { PlusOutlined, ScheduleOutlined } from '@ant-design/icons';
import { AppLayout } from '@/components/Layout/AppLayout';
import { TaskTable } from '@/components/Tasks/TaskTable';
import { TaskFormDrawer } from '@/components/Tasks/TaskForm';
import { useTasks } from '@/hooks/useTasks';
import { collectTaskTags, taskMatchesTags } from '@/lib/tags';
import type { Task } from '@/lib/types';

export default function TaskListView() {
  const { tasks, isLoading, mutate } = useTasks();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const tagOptions = useMemo(() => collectTaskTags(tasks), [tasks]);
  const filteredTasks = useMemo(
    () => tasks.filter((task) => taskMatchesTags(task, selectedTags)),
    [tasks, selectedTags]
  );

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

  const handleTagChange = (tag: string, checked: boolean) => {
    setSelectedTags((current) =>
      checked ? [...current, tag] : current.filter((selectedTag) => selectedTag !== tag)
    );
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
        <Space style={{ width: '100%', justifyContent: 'space-between', display: 'flex' }} wrap>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Tasks
          </Typography.Title>
          <Space wrap>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              New Task
            </Button>
          </Space>
        </Space>
      </div>

      {tagOptions.length > 0 && (
        <div className="task-tag-filter">
          <Typography.Text type="secondary" className="task-tag-filter-label">
            Tags
          </Typography.Text>
          <Space size={[6, 8]} wrap>
            <Tag.CheckableTag
              checked={selectedTags.length === 0}
              onChange={() => setSelectedTags([])}
            >
              All
            </Tag.CheckableTag>
            {tagOptions.map((tag) => (
              <Tag.CheckableTag
                key={tag}
                checked={selectedTags.includes(tag)}
                onChange={(checked) => handleTagChange(tag, checked)}
              >
                {tag}
              </Tag.CheckableTag>
            ))}
          </Space>
        </div>
      )}

      <TaskTable
        tasks={filteredTasks}
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
