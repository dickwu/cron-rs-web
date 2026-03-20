'use client';

import React, { Suspense } from 'react';
import { Spin } from 'antd';
import TasksPageContent from './TasksPageContent';

export default function TasksPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>}>
      <TasksPageContent />
    </Suspense>
  );
}
