'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import TaskListView from './TaskListView';
import TaskDetailView from './TaskDetailView';

export default function TasksPageContent() {
  const searchParams = useSearchParams();
  const taskId = searchParams.get('id');

  if (taskId) {
    return <TaskDetailView taskId={taskId} />;
  }

  return <TaskListView />;
}
