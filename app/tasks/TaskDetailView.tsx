'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Space } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { AppLayout } from '@/components/Layout/AppLayout';
import { TaskDetailContent } from '@/components/Tasks/TaskDetailContent';
import { returnToOrFallback } from '@/lib/navigation';

interface TaskDetailViewProps {
  taskId: string;
}

export default function TaskDetailView({ taskId }: TaskDetailViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleBack = () => router.replace(returnToOrFallback(searchParams, '/tasks'));

  return (
    <AppLayout>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button aria-label="Back" icon={<ArrowLeftOutlined />} onClick={handleBack} />
        </Space>
      </div>
      <TaskDetailContent taskId={taskId} />
    </AppLayout>
  );
}
