'use client';

import React, { useMemo } from 'react';
import { Typography, Card, Select, Space, Tag } from 'antd';
import { AppLayout } from '@/components/Layout/AppLayout';
import { RunsTable } from '@/components/Runs/RunsTable';
import { useRunSummaries } from '@/hooks/useRuns';
import { useTasks } from '@/hooks/useTasks';
import { collectTaskTags, taskMatchesTags } from '@/lib/tags';
import { useUiStore } from '@/stores/uiStore';
import type { Task } from '@/lib/types';

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'success', label: 'Success' },
  { value: 'failed', label: 'Failed' },
  { value: 'running', label: 'Running' },
  { value: 'retrying', label: 'Retrying' },
  { value: 'timeout', label: 'Timeout' },
  { value: 'skipped', label: 'Skipped' },
  { value: 'crashed', label: 'Crashed' },
];

// Pull a wider window when any client-side filter is engaged so pagination
// stays accurate after filtering.
const FETCH_LIMIT = 500;

export default function RunListView() {
  const taskFilter = useUiStore((state) => state.runTaskFilter);
  const statusFilter = useUiStore((state) => state.runStatusFilter);
  const selectedTags = useUiStore((state) => state.runSelectedTags);
  const page = useUiStore((state) => state.runPage);
  const pageSize = useUiStore((state) => state.runPageSize);
  const setTaskFilter = useUiStore((state) => state.setRunTaskFilter);
  const setStatusFilter = useUiStore((state) => state.setRunStatusFilter);
  const setSelectedTags = useUiStore((state) => state.setRunSelectedTags);
  const setPage = useUiStore((state) => state.setRunPage);
  const setPageSize = useUiStore((state) => state.setRunPageSize);

  const { tasks } = useTasks();
  const taskMap = useMemo<Record<string, Task>>(() => {
    const map: Record<string, Task> = {};
    for (const task of tasks) map[task.id] = task;
    return map;
  }, [tasks]);

  const { runs: allRuns, isLoading } = useRunSummaries({
    task_id: taskFilter || undefined,
    status: statusFilter || undefined,
    limit: FETCH_LIMIT,
  });

  const tagOptions = useMemo(() => collectTaskTags(tasks), [tasks]);
  const tagsActive = selectedTags.length > 0;

  const matchingTaskIds = useMemo(() => {
    if (!tagsActive) return null;
    const ids = new Set<string>();
    for (const task of tasks) {
      if (taskMatchesTags(task, selectedTags)) ids.add(task.id);
    }
    return ids;
  }, [tasks, selectedTags, tagsActive]);

  const filteredRuns = useMemo(() => {
    if (!matchingTaskIds) return allRuns;
    return allRuns.filter((run) => matchingTaskIds.has(run.task_id));
  }, [allRuns, matchingTaskIds]);

  const taskOptions = [
    { value: '', label: 'All Tasks' },
    ...tasks.map((t) => ({ value: t.id, label: t.name })),
  ];

  const handleTagChange = (tag: string, checked: boolean) => {
    setSelectedTags(checked ? [...selectedTags, tag] : selectedTags.filter((t) => t !== tag));
  };

  // When tag filter is engaged we paginate the filtered list locally because
  // the backend only knows about a single task_id, not tag membership.
  const pageStart = (page - 1) * pageSize;
  const pageEnd = pageStart + pageSize;
  const visibleRuns = tagsActive ? filteredRuns.slice(pageStart, pageEnd) : filteredRuns;
  const total = tagsActive
    ? filteredRuns.length
    : filteredRuns.length < pageSize
      ? (page - 1) * pageSize + filteredRuns.length
      : page * pageSize + 1;

  return (
    <AppLayout>
      <div style={{ marginBottom: 24 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Runs
        </Typography.Title>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            value={taskFilter}
            onChange={setTaskFilter}
            options={taskOptions}
            style={{ minWidth: 200 }}
            placeholder="Filter by task"
            showSearch
            optionFilterProp="label"
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={statusOptions}
            style={{ minWidth: 150 }}
            placeholder="Filter by status"
          />
        </Space>
      </Card>

      {tagOptions.length > 0 && (
        <div className="task-tag-filter" style={{ marginBottom: 16 }}>
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

      <RunsTable
        runs={visibleRuns}
        loading={isLoading}
        taskMap={taskMap}
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />
    </AppLayout>
  );
}
