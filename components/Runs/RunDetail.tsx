'use client';

import React, { useState } from 'react';
import { Button, Card, Descriptions, Table, Tag, Row, Col, Statistic, Skeleton, Typography, Tooltip } from 'antd';
import {
  ClockCircleOutlined,
  CodeOutlined,
  FieldTimeOutlined,
  ProfileOutlined,
} from '@ant-design/icons';
import { StatusBadge } from '@/components/Dashboard/RecentRuns';
import { TaskDetailModal } from '@/components/Tasks/TaskDetailModal';
import { OutputViewer } from './OutputViewer';
import { fmtDateTime } from '@/lib/date';
import type { JobRun, HookRun } from '@/lib/types';

interface RunDetailViewProps {
  run: JobRun;
  hookRuns: HookRun[];
  hookRunsLoading: boolean;
  taskName?: string;
}

export function RunDetailView({ run, hookRuns, hookRunsLoading, taskName }: RunDetailViewProps) {
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const hookColumns = [
    {
      title: 'Hook ID',
      dataIndex: 'hook_id',
      key: 'hook_id',
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: HookRun['status']) => {
        const colorMap = { success: 'success', failed: 'error', timeout: 'error' };
        return <Tag color={colorMap[status]}>{status}</Tag>;
      },
    },
    {
      title: 'Exit Code',
      dataIndex: 'exit_code',
      key: 'exit_code',
      width: 80,
      render: (code: number | null) => <span className="mono">{code !== null ? code : '-'}</span>,
    },
    {
      title: 'Started',
      dataIndex: 'started_at',
      key: 'started_at',
      width: 140,
      render: (val: string) => fmtDateTime(val),
    },
  ];

  return (
    <>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={8} sm={6} md={4}>
          <Card>
            <Statistic
              title="Status"
              valueRender={() => <StatusBadge status={run.status} />}
            />
          </Card>
        </Col>
        <Col xs={8} sm={6} md={4}>
          <Card>
            <Statistic
              title="Exit Code"
              value={run.exit_code !== null ? run.exit_code : '-'}
              prefix={<CodeOutlined />}
              valueStyle={{
                fontFamily: "var(--font-mono)",
                color: run.exit_code === 0 ? '#52c41a' : run.exit_code !== null ? '#ff4d4f' : undefined,
              }}
            />
          </Card>
        </Col>
        <Col xs={8} sm={6} md={4}>
          <Card>
            <Statistic
              title="Duration"
              value={
                run.duration_ms !== null
                  ? run.duration_ms < 1000
                    ? `${run.duration_ms}ms`
                    : `${(run.duration_ms / 1000).toFixed(1)}s`
                  : '-'
              }
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={8} sm={6} md={4}>
          <Card>
            <Statistic
              title="Attempt"
              value={run.attempt}
              prefix={<FieldTimeOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2 }}>
          <Descriptions.Item label="Task">
            <span>
              {taskName ? (
                <>
                  {taskName}{' '}
                  <span className="mono" style={{ color: '#999', fontSize: 12 }}>
                    ({run.task_id})
                  </span>
                </>
              ) : (
                <span className="mono">{run.task_id}</span>
              )}
              <Tooltip title="View task detail">
                <Button
                  type="link"
                  size="small"
                  icon={<ProfileOutlined />}
                  onClick={() => setTaskModalOpen(true)}
                  style={{ marginLeft: 8 }}
                >
                  View task
                </Button>
              </Tooltip>
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="Run ID">
            <span className="mono">{run.id}</span>
          </Descriptions.Item>
          <Descriptions.Item label="Started">
            {fmtDateTime(run.started_at)}
          </Descriptions.Item>
          <Descriptions.Item label="Finished">
            {run.finished_at ? fmtDateTime(run.finished_at) : 'Still running'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="stdout" style={{ marginBottom: 16 }}>
        <OutputViewer content={run.stdout} variant="stdout" />
      </Card>

      <Card title="stderr" style={{ marginBottom: 16 }}>
        <OutputViewer content={run.stderr} variant="stderr" />
      </Card>

      <Card title="Hook Runs">
        <Table
          dataSource={hookRuns}
          columns={hookColumns}
          rowKey="id"
          loading={hookRunsLoading}
          pagination={false}
          size="small"
          locale={{ emptyText: 'No hooks fired for this run' }}
        />
      </Card>

      <TaskDetailModal
        taskId={run.task_id}
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
      />
    </>
  );
}
