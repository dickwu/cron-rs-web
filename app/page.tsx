'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Typography, Button, Space, Row, Col } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { AppLayout } from '@/components/Layout/AppLayout';
import { StatsCards } from '@/components/Dashboard/StatsCards';
import { RunChart } from '@/components/Dashboard/RunChart';
import { RecentRuns } from '@/components/Dashboard/RecentRuns';
import { useDashboardSummary } from '@/hooks/useDashboard';
import { TaskFormDrawer } from '@/components/Tasks/TaskForm';
import { useDashboardStore } from '@/stores/dashboardStore';

export default function DashboardPage() {
  const router = useRouter();
  const { summary } = useDashboardSummary();
  const drawerOpen = useDashboardStore((state) => state.taskDrawerOpen);
  const setDrawerOpen = useDashboardStore((state) => state.setTaskDrawerOpen);

  const hasTasks = (summary?.task_count ?? 0) > 0;

  const handleCreateTask = () => {
    setDrawerOpen(true);
  };

  const handleTaskCreated = () => {
    setDrawerOpen(false);
    router.push('/tasks');
  };

  return (
    <AppLayout>
      <div style={{ marginBottom: 24 }}>
        <Space style={{ width: '100%', justifyContent: 'space-between', display: 'flex' }}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Dashboard
          </Typography.Title>
          {hasTasks && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateTask}>
              New Task
            </Button>
          )}
        </Space>
      </div>

      <StatsCards onCreateTask={handleCreateTask} />

      {hasTasks && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} xl={12}>
            <RunChart />
          </Col>
          <Col xs={24} xl={12}>
            <RecentRuns />
          </Col>
        </Row>
      )}

      <TaskFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={handleTaskCreated}
      />
    </AppLayout>
  );
}
