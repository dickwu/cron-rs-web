'use client';

import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, Select, message } from 'antd';
import { createGlobalHook, createHook, updateHook } from '@/lib/api';
import type { CreateGlobalHookPayload, CreateHookPayload, Hook } from '@/lib/types';

const { Option } = Select;

interface HookFormProps {
  open: boolean;
  taskId?: string;
  isGlobal?: boolean;
  onClose: () => void;
  onSuccess: () => void;
  hook?: Hook | null;
}

export function HookForm({ open, taskId, isGlobal = false, onClose, onSuccess, hook }: HookFormProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const isEditing = !!hook;

  useEffect(() => {
    if (!open) return;

    if (hook) {
      form.setFieldsValue({
        hook_type: hook.hook_type,
        command: hook.command,
        timeout_secs: hook.timeout_secs ?? 30,
        run_order: hook.run_order,
      });
      return;
    }

    form.resetFields();
    form.setFieldsValue({ timeout_secs: 30, run_order: 0, hook_type: 'on_failure' });
  }, [form, hook, open]);

  const handleSubmit = async (
    values: Omit<CreateHookPayload, 'task_id'> | CreateGlobalHookPayload
  ) => {
    setLoading(true);
    try {
      if (hook) {
        await updateHook(hook.id, values);
        message.success(isGlobal ? 'Global hook updated' : 'Hook updated');
      } else if (isGlobal) {
        await createGlobalHook(values);
        message.success('Global hook created');
      } else {
        if (!taskId) {
          throw new Error('Task id is required');
        }
        await createHook({ ...values, task_id: taskId });
        message.success('Hook created');
      }
      form.resetFields();
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to ${isEditing ? 'update' : 'create'} hook`;
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={isEditing ? `Edit ${isGlobal ? 'Global ' : ''}Hook` : `Add ${isGlobal ? 'Global ' : ''}Hook`}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
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
