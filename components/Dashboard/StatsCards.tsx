'use client';

import React from 'react';
import { Card, Statistic, Skeleton, Row, Col, Typography, Button } from 'antd';
import {
  ScheduleOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useStatus } from '@/hooks/useRuns';
import type { StatusResponse } from '@/lib/types';

interface StatsCardsProps {
  onCreateTask: () => void;
}

function GuidedEmptyState({ onCreateTask }: { onCreateTask: () => void }) {
  return (
    <div className="empty-state">
      <ScheduleOutlined style={{ fontSize: 64, color: '#bfbfbf', marginBottom: 24 }} />
      <h2>Welcome to cron-rs</h2>
      <p>
        You have no scheduled tasks yet. Create your first task to start monitoring
        your systemd timers.
      </p>
      <Button type="primary" size="large" icon={<PlusOutlined />} onClick={onCreateTask}>
        Create your first scheduled task
      </Button>
    </div>
  );
}

function StatsGrid({ status }: { status: StatusResponse }) {
  return (
    <Row gutter={[16, 16]} className="stats-grid">
      <Col xs={12} sm={12} md={6}>
        <Card>
          <Statistic
            title="Total Tasks"
            value={status.task_count}
            prefix={<ScheduleOutlined />}
          />
        </Card>
      </Col>
      <Col xs={12} sm={12} md={6}>
        <Card>
          <Statistic
            title="Runs (24h)"
            value={status.runs_24h}
            prefix={<ThunderboltOutlined />}
          />
        </Card>
      </Col>
      <Col xs={12} sm={12} md={6}>
        <Card>
          <Statistic
            title="Success Rate"
            value={status.success_rate}
            precision={1}
            suffix="%"
            prefix={<CheckCircleOutlined />}
            valueStyle={{
              color: status.success_rate >= 90 ? '#52c41a' : status.success_rate >= 70 ? '#faad14' : '#ff4d4f',
            }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={12} md={6}>
        <Card>
          <Statistic
            title="Active Timers"
            value={status.active_timers}
            prefix={<PlayCircleOutlined />}
          />
        </Card>
      </Col>
    </Row>
  );
}

export function StatsCards({ onCreateTask }: StatsCardsProps) {
  const { status, isLoading, isError } = useStatus();

  if (isLoading) {
    return (
      <Row gutter={[16, 16]}>
        {[1, 2, 3, 4].map((i) => (
          <Col xs={12} sm={12} md={6} key={i}>
            <Card>
              <Skeleton active paragraph={{ rows: 1 }} />
            </Card>
          </Col>
        ))}
      </Row>
    );
  }

  if (isError) {
    return (
      <Card>
        <Typography.Text type="danger">Could not load dashboard statistics</Typography.Text>
      </Card>
    );
  }

  if (status && status.task_count === 0) {
    return <GuidedEmptyState onCreateTask={onCreateTask} />;
  }

  if (status) {
    return <StatsGrid status={status} />;
  }

  return null;
}
