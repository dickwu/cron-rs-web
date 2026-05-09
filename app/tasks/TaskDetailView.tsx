'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button, Space } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { AppLayout } from '@/components/Layout/AppLayout';
import { TaskDetailContent } from '@/components/Tasks/TaskDetailContent';

interface TaskDetailViewProps {
  taskId: string;
}

export default function TaskDetailView({ taskId }: TaskDetailViewProps) {
  const router = useRouter();

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.replace('/tasks');
  };

  return (
    <AppLayout>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={handleBack} />
        </Space>
      </div>
      <TaskDetailContent taskId={taskId} />
    </AppLayout>
  );
}
