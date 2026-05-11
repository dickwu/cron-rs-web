'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Typography, Button, Space, Skeleton } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { AppLayout } from '@/components/Layout/AppLayout';
import { RunDetailView } from '@/components/Runs/RunDetail';
import { useRun, useHookRuns } from '@/hooks/useRuns';
import { useTask } from '@/hooks/useTasks';

interface RunDetailViewPageProps {
  runId: string;
}

export default function RunDetailViewPage({ runId }: RunDetailViewPageProps) {
  const router = useRouter();
  const { run, isLoading } = useRun(runId);
  const { hookRuns, isLoading: hookRunsLoading } = useHookRuns(runId);
  const { task } = useTask(run?.task_id ?? null);

  if (isLoading) {
    return (
      <AppLayout>
        <Skeleton active paragraph={{ rows: 10 }} />
      </AppLayout>
    );
  }

  if (!run) {
    return (
      <AppLayout>
        <Typography.Text type="danger">Run not found</Typography.Text>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={{ marginBottom: 24 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/runs')} />
          <Typography.Title level={3} style={{ margin: 0 }}>
            Run Detail
          </Typography.Title>
        </Space>
      </div>

      <RunDetailView
        run={run}
        hookRuns={hookRuns}
        hookRunsLoading={hookRunsLoading}
        taskName={task?.name}
      />
    </AppLayout>
  );
}
