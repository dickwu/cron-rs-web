'use client';

import React, { useState } from 'react';
import { Modal, Form, Input, InputNumber, Select, message } from 'antd';
import { createHook } from '@/lib/api';
import type { CreateHookPayload } from '@/lib/types';

const { Option } = Select;

interface HookFormProps {
  open: boolean;
  taskId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function HookForm({ open, taskId, onClose, onSuccess }: HookFormProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: Omit<CreateHookPayload, 'task_id'>) => {
    setLoading(true);
    try {
      await createHook({ ...values, task_id: taskId });
      message.success('Hook created');
      form.resetFields();
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create hook';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Add Hook"
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ timeout_secs: 30, run_order: 0, hook_type: 'on_failure' }}
      >
        <Form.Item
          name="hook_type"
          label="Hook Type"
          rules={[{ required: true }]}
        >
          <Select>
            <Option value="on_failure">On Failure</Option>
            <Option value="on_success">On Success</Option>
            <Option value="on_retry_exhausted">On Retry Exhausted</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="command"
          label="Command"
          rules={[{ required: true, message: 'Command is required' }]}
        >
          <Input.TextArea
            placeholder="/usr/local/bin/notify.sh"
            rows={2}
            style={{ fontFamily: "var(--font-mono)" }}
          />
        </Form.Item>

        <Form.Item name="timeout_secs" label="Timeout (seconds)">
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="run_order" label="Run Order">
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
