'use client';

import React, { useState, useEffect } from 'react';
import { Drawer, Form, Input, InputNumber, Select, Button, Space, message, Typography } from 'antd';
import { createTask, updateTask, getSchedulePreview } from '@/lib/api';
import type { Task, CreateTaskPayload } from '@/lib/types';

const { TextArea } = Input;
const { Option } = Select;

interface TaskFormDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  task?: Task | null;
}

export function TaskFormDrawer({ open, onClose, onSuccess, task }: TaskFormDrawerProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [schedulePreview, setSchedulePreview] = useState<string[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const isEditing = !!task;

  useEffect(() => {
    if (open && task) {
      form.setFieldsValue({
        name: task.name,
        command: task.command,
        schedule: task.schedule,
        description: task.description,
        max_retries: task.max_retries,
        retry_delay_secs: task.retry_delay_secs,
        timeout_secs: task.timeout_secs,
        concurrency_policy: task.concurrency_policy,
      });
    } else if (open) {
      form.resetFields();
      form.setFieldsValue({
        max_retries: 0,
        retry_delay_secs: 60,
        concurrency_policy: 'skip',
      });
    }
    setSchedulePreview(null);
    setPreviewError(null);
  }, [open, task, form]);

  const handlePreviewSchedule = async () => {
    const schedule = form.getFieldValue('schedule');
    if (!schedule) {
      setPreviewError('Enter a schedule');
      return;
    }
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const times = await getSchedulePreview(schedule, 5);
      setSchedulePreview(times);
    } catch {
      setPreviewError('Invalid format');
      setSchedulePreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSubmit = async (values: CreateTaskPayload) => {
    setLoading(true);
    try {
      if (isEditing && task) {
        await updateTask(task.id, values);
        message.success('Task updated');
      } else {
        await createTask(values);
        message.success('Task created');
      }
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Operation failed';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      title={isEditing ? 'Edit Task' : 'New Task'}
      open={open}
      onClose={onClose}
      width={520}
      extra={
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" loading={loading} onClick={() => form.submit()}>
            {isEditing ? 'Update' : 'Create'}
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="name"
          label="Name"
          rules={[{ required: true, message: 'Task name is required' }]}
        >
          <Input placeholder="backup-database" disabled={loading} />
        </Form.Item>

        <Form.Item
          name="command"
          label="Command"
          rules={[{ required: true, message: 'Command is required' }]}
        >
          <TextArea
            placeholder="/usr/local/bin/backup.sh"
            rows={2}
            disabled={loading}
            style={{ fontFamily: "var(--font-mono)" }}
          />
        </Form.Item>

        <Form.Item
          name="schedule"
          label="Schedule (OnCalendar)"
          rules={[{ required: true, message: 'Schedule is required' }]}
        >
          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="*-*-* 02:00:00"
              disabled={loading}
              style={{ fontFamily: "var(--font-mono)" }}
            />
          </Space.Compact>
        </Form.Item>

        <div style={{ marginBottom: 16 }}>
          <Button size="small" onClick={handlePreviewSchedule} loading={previewLoading}>
            Preview Schedule
          </Button>
          {previewError && (
            <Typography.Text type="danger" style={{ marginLeft: 8, fontSize: 12 }}>
              {previewError}
            </Typography.Text>
          )}
          {schedulePreview && (
            <div style={{ marginTop: 8 }}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Next runs:
              </Typography.Text>
              {schedulePreview.map((time, i) => (
                <div key={i} className="mono" style={{ fontSize: 12, color: '#595959' }}>
                  {new Date(time).toLocaleString()}
                </div>
              ))}
            </div>
          )}
        </div>

        <Form.Item name="description" label="Description">
          <TextArea placeholder="Optional description" rows={2} disabled={loading} />
        </Form.Item>

        <Form.Item name="max_retries" label="Max Retries">
          <InputNumber min={0} max={10} style={{ width: '100%' }} disabled={loading} />
        </Form.Item>

        <Form.Item name="retry_delay_secs" label="Retry Delay (seconds)">
          <InputNumber min={0} style={{ width: '100%' }} disabled={loading} />
        </Form.Item>

        <Form.Item name="timeout_secs" label="Timeout (seconds)">
          <InputNumber min={0} style={{ width: '100%' }} disabled={loading} placeholder="No timeout" />
        </Form.Item>

        <Form.Item name="concurrency_policy" label="Concurrency Policy">
          <Select disabled={loading}>
            <Option value="skip">Skip</Option>
            <Option value="allow">Allow</Option>
            <Option value="queue">Queue</Option>
          </Select>
        </Form.Item>
      </Form>
    </Drawer>
  );
}
