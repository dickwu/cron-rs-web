'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Form, Input, Button, Typography, message } from 'antd';
import { LockOutlined, UserOutlined, ApiOutlined } from '@ant-design/icons';
import { login } from '@/lib/api';
import { setToken, setApiUrl, getApiUrl, isAuthenticated } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace('/');
    }
    form.setFieldsValue({ apiUrl: getApiUrl() });
  }, [router, form]);

  const handleSubmit = async (values: {
    apiUrl: string;
    username: string;
    password: string;
  }) => {
    setLoading(true);
    try {
      setApiUrl(values.apiUrl);
      const res = await login({
        username: values.username,
        password: values.password,
      });
      setToken(res.token);
      message.success('Login successful');
      router.push('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      message.error(msg === 'Unauthorized' ? 'Invalid credentials' : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <Card>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <Typography.Title level={2} style={{ marginBottom: 4 }}>
              cron-rs
            </Typography.Title>
            <Typography.Text type="secondary">
              Systemd timer management dashboard
            </Typography.Text>
          </div>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            autoComplete="off"
          >
            <Form.Item
              name="apiUrl"
              label="API URL"
              rules={[{ required: true, message: 'API URL is required' }]}
            >
              <Input
                prefix={<ApiOutlined />}
                placeholder="http://localhost:9746"
                disabled={loading}
              />
            </Form.Item>
            <Form.Item
              name="username"
              label="Username"
              rules={[{ required: true, message: 'Username is required' }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="admin"
                disabled={loading}
                autoComplete="username"
              />
            </Form.Item>
            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: 'Password is required' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Password"
                disabled={loading}
                autoComplete="current-password"
              />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
              >
                Sign In
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
}
