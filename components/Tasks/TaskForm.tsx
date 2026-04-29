'use client';

import React, { useState, useEffect } from 'react';
import { Alert, Drawer, Form, Input, InputNumber, Select, Button, Space, message, Typography } from 'antd';
import { createTask, updateTask } from '@/lib/api';
import { describeSchedule, getImportedCronExpression, normalizeScheduleExpression } from '@/lib/schedule';
import { normalizeTags } from '@/lib/tags';
import { SchedulePickerModal } from './SchedulePickerModal';
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
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  const isEditing = !!task;
  const scheduleValue = Form.useWatch('schedule', form);
  const originalCronExpression = task ? getImportedCronExpression(task.description) : null;

  useEffect(() => {
    if (open && task) {
      form.resetFields();
      form.setFieldsValue({
        name: task.name,
        command: task.command,
        schedule: task.schedule,
        tags: task.tags || [],
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
        tags: [],
      });
    }
  }, [open, task, form]);

  const handleSubmit = async (values: CreateTaskPayload) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        schedule: normalizeScheduleExpression(values.schedule),
        tags: normalizeTags(values.tags),
      };
      if (isEditing && task) {
        await updateTask(task.id, payload);
        message.success('Task updated');
      } else {
        await createTask(payload);
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

        <Form.Item name="schedule" hidden rules={[{ required: true, message: 'Schedule is required' }]}>
          <Input />
        </Form.Item>

        <Form.Item
          label="Schedule"
          required
          validateStatus={form.getFieldError('schedule').length ? 'error' : undefined}
          help={form.getFieldError('schedule')[0]}
        >
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            {originalCronExpression && (
              <Alert
                type="info"
                showIcon
                message={`Imported cron source: ${originalCronExpression}`}
              />
            )}
            {scheduleValue ? (
              <>
                <Typography.Text>{describeSchedule(scheduleValue).summary}</Typography.Text>
                <Typography.Text className="mono" type="secondary">
                  {scheduleValue}
                </Typography.Text>
              </>
            ) : (
              <Typography.Text type="secondary">No schedule selected yet.</Typography.Text>
            )}
            <Button onClick={() => setScheduleModalOpen(true)} disabled={loading}>
              {scheduleValue ? 'Change Schedule' : 'Set Schedule'}
            </Button>
          </Space>
        </Form.Item>

        <Form.Item name="description" label="Description">
          <TextArea placeholder="Optional description" rows={2} disabled={loading} />
        </Form.Item>

        <Form.Item name="tags" label="Tags">
          <Select
            mode="tags"
            tokenSeparators={[',']}
            placeholder="Add tags"
            disabled={loading}
            options={[]}
          />
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

      <SchedulePickerModal
        open={scheduleModalOpen}
        value={scheduleValue}
        originalCronExpression={originalCronExpression}
        onCancel={() => setScheduleModalOpen(false)}
        onApply={(nextSchedule) => {
          form.setFieldValue('schedule', nextSchedule);
          setScheduleModalOpen(false);
        }}
      />
    </Drawer>
  );
}
