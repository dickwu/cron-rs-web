'use client';

import React, { useMemo } from 'react';
import { Typography, Button, Input, Space, Tag } from 'antd';
import { PlusOutlined, ScheduleOutlined, SearchOutlined } from '@ant-design/icons';
import { AppLayout } from '@/components/Layout/AppLayout';
import { TaskTable } from '@/components/Tasks/TaskTable';
import { TaskFormDrawer } from '@/components/Tasks/TaskForm';
import { useTasks } from '@/hooks/useTasks';
import { collectTaskTags, taskMatchesTags } from '@/lib/tags';
import { useUiStore } from '@/stores/uiStore';
import type { Task } from '@/lib/types';

export default function TaskListView() {
  const { tasks, isLoading, mutate } = useTasks();
  const drawerOpen = useUiStore((state) => state.taskDrawerOpen);
  const editingTaskId = useUiStore((state) => state.editingTaskId);
  const selectedTags = useUiStore((state) => state.taskSelectedTags);
  const query = useUiStore((state) => state.taskQuery);
  const setDrawerOpen = useUiStore((state) => state.setTaskDrawerOpen);
  const setEditingTaskId = useUiStore((state) => state.setEditingTaskId);
  const setSelectedTags = useUiStore((state) => state.setTaskSelectedTags);
  const setQuery = useUiStore((state) => state.setTaskQuery);
  const editingTask = useMemo(
    () => tasks.find((task) => task.id === editingTaskId) ?? null,
    [editingTaskId, tasks]
  );
  const tagOptions = useMemo(() => collectTaskTags(tasks), [tasks]);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        if (!taskMatchesTags(task, selectedTags)) {
          return false;
        }

        if (!normalizedQuery) {
          return true;
        }

        return [task.name, task.command].some(
          (value) => value && value.toLowerCase().includes(normalizedQuery)
        );
      }),
    [normalizedQuery, tasks, selectedTags]
  );

  const handleEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setDrawerOpen(true);
  };

  const handleCreate = () => {
    setEditingTaskId(null);
    setDrawerOpen(true);
  };

  const handleSuccess = () => {
    setDrawerOpen(false);
    setEditingTaskId(null);
    mutate();
  };

  const handleTagChange = (tag: string, checked: boolean) => {
    setSelectedTags(
      checked ? [...selectedTags, tag] : selectedTags.filter((selectedTag) => selectedTag !== tag)
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
            <Input
              allowClear
              placeholder="Search name or command"
              prefix={<SearchOutlined />}
              style={{ width: 280 }}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
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
