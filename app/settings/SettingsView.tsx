'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Row,
  Space,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import { AppLayout } from '@/components/Layout/AppLayout';
import { HookTable } from '@/components/Hooks/HookTable';
import { useStatus } from '@/hooks/useRuns';
import {
  clearApiUrl,
  clearToken,
  getApiUrl,
  getBrowserDefaultApiUrl,
  getStoredApiUrl,
  setApiUrl,
} from '@/lib/auth';
import { swrFetcher, updateSettings } from '@/lib/api';
import type { AppSettings } from '@/lib/types';
import { fmtDateTime } from '@/lib/date';

interface TokenClaims {
  exp?: number;
  sub?: string;
}

function decodeClaims(token: string | null): TokenClaims | null {
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, '=');
    return JSON.parse(window.atob(padded)) as TokenClaims;
  } catch {
    return null;
  }
}

export default function SettingsView() {
  const router = useRouter();
  const { message } = App.useApp();
  const { status, isLoading, isError } = useStatus();
  const [form] = Form.useForm<{ apiUrl: string }>();
  const [retentionForm] = Form.useForm<{ retention_days: number }>();
  const [connectionCheck, setConnectionCheck] = useState<'idle' | 'success' | 'error'>('idle');
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [savingRetention, setSavingRetention] = useState(false);
  const [browserDefaultApiUrl, setBrowserDefaultApiUrl] = useState('http://localhost:9746');
  const [currentApiUrl, setCurrentApiUrl] = useState('http://localhost:9746');
  const [storedApiUrl, setStoredApiUrl] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [claims, setClaims] = useState<TokenClaims | null>(null);
  const [origin, setOrigin] = useState('Unknown');

  const {
    data: settings,
    error: settingsError,
    isLoading: settingsLoading,
    mutate: mutateSettings,
  } = useSWR<AppSettings>('/api/v1/settings', swrFetcher, {
    revalidateOnFocus: false,
  });

  useEffect(() => {
    if (settings?.retention_days !== undefined) {
      retentionForm.setFieldsValue({ retention_days: settings.retention_days });
    }
  }, [settings?.retention_days, retentionForm]);

  const expiryLabel = claims?.exp ? fmtDateTime(claims.exp * 1000) : 'Unknown';

  useEffect(() => {
    const nextBrowserDefault = getBrowserDefaultApiUrl();
    const nextCurrentApiUrl = getApiUrl();
    const nextStoredApiUrl = getStoredApiUrl();
    const nextToken = window.localStorage.getItem('cron_rs_token');

    setBrowserDefaultApiUrl(nextBrowserDefault);
    setCurrentApiUrl(nextCurrentApiUrl);
    setStoredApiUrl(nextStoredApiUrl);
    setToken(nextToken);
    setClaims(decodeClaims(nextToken));
    setOrigin(window.location.origin);
    form.setFieldsValue({ apiUrl: nextCurrentApiUrl });
  }, [form]);

  const handleSave = async () => {
    const values = await form.validateFields();
    setApiUrl(values.apiUrl);
    setCurrentApiUrl(values.apiUrl.replace(/\/+$/, ''));
    setStoredApiUrl(values.apiUrl.replace(/\/+$/, ''));
    setConnectionCheck('idle');
    message.success('API URL saved');
  };

  const handleReset = () => {
    clearApiUrl();
    setCurrentApiUrl(browserDefaultApiUrl);
    setStoredApiUrl(null);
    form.setFieldsValue({ apiUrl: browserDefaultApiUrl });
    setConnectionCheck('idle');
    message.success('API URL reset to browser default');
  };

  const handleCheckConnection = async () => {
    const values = await form.validateFields();
    setCheckingConnection(true);
    setConnectionCheck('idle');

    try {
      const response = await fetch(`${values.apiUrl.replace(/\/+$/, '')}/api/v1/health`);
      if (!response.ok) {
        throw new Error('Health check failed');
      }
      setConnectionCheck('success');
    } catch {
      setConnectionCheck('error');
    } finally {
      setCheckingConnection(false);
    }
  };

  const handleSignOut = () => {
    clearToken();
    setToken(null);
    setClaims(null);
    router.push('/login');
  };

  const handleSaveRetention = async () => {
    const values = await retentionForm.validateFields();
    setSavingRetention(true);
    try {
      const updated = await updateSettings({ retention_days: values.retention_days });
      await mutateSettings(updated, { revalidate: false });
      message.success(`Logs older than ${updated.retention_days} day(s) will be auto-deleted`);
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Failed to save settings';
      message.error(detail);
    } finally {
      setSavingRetention(false);
    }
  };

  return (
    <AppLayout>
      <div style={{ marginBottom: 24 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Settings
        </Typography.Title>
        <Typography.Text type="secondary">
          Manage the dashboard connection and review the current runtime state.
        </Typography.Text>
      </div>

      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card title="Connection">
          <Form form={form} layout="vertical">
            <Form.Item
              name="apiUrl"
              label="API URL"
              rules={[{ required: true, message: 'API URL is required' }]}
            >
              <Input placeholder="http://server:9746" />
            </Form.Item>
          </Form>

          <Space wrap>
            <Button type="primary" onClick={handleSave}>
              Save
            </Button>
            <Button onClick={handleCheckConnection} loading={checkingConnection}>
              Test Connection
            </Button>
            <Button onClick={handleReset}>Use Browser Default</Button>
          </Space>

          <Descriptions
            column={{ xs: 1, md: 2 }}
            size="small"
            style={{ marginTop: 16 }}
          >
            <Descriptions.Item label="Current API URL">{currentApiUrl}</Descriptions.Item>
            <Descriptions.Item label="Saved Override">
              {storedApiUrl ? <Tag color="blue">{storedApiUrl}</Tag> : 'None'}
            </Descriptions.Item>
            <Descriptions.Item label="Browser Default">
              {browserDefaultApiUrl}
            </Descriptions.Item>
            <Descriptions.Item label="Web Origin">
              {origin}
            </Descriptions.Item>
          </Descriptions>

          {connectionCheck === 'success' && (
            <Alert
              style={{ marginTop: 16 }}
              type="success"
              showIcon
              message="Health check succeeded"
            />
          )}
          {connectionCheck === 'error' && (
            <Alert
              style={{ marginTop: 16 }}
              type="error"
              showIcon
              message="Could not reach the health endpoint for that API URL"
            />
          )}
        </Card>

        <Card title="Log Retention">
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            Job runs and their captured stdout/stderr older than this many days are deleted
            automatically. The pruner runs once on daemon startup and then every 24 hours.
          </Typography.Text>
          {settingsError ? (
            <Alert
              type="error"
              showIcon
              message="Could not load retention setting"
              style={{ marginBottom: 16 }}
            />
          ) : null}
          <Form form={retentionForm} layout="vertical" disabled={settingsLoading}>
            <Form.Item
              name="retention_days"
              label="Retention (days)"
              rules={[
                { required: true, message: 'Retention is required' },
                {
                  type: 'number',
                  min: 1,
                  max: 3650,
                  message: 'Must be between 1 and 3650 days',
                },
              ]}
            >
              <InputNumber min={1} max={3650} style={{ width: 200 }} />
            </Form.Item>
          </Form>
          <Space wrap>
            <Button type="primary" onClick={handleSaveRetention} loading={savingRetention}>
              Save
            </Button>
          </Space>
          <Descriptions column={1} size="small" style={{ marginTop: 16 }}>
            <Descriptions.Item label="Currently">
              {settings ? `${settings.retention_days} day(s)` : settingsLoading ? '…' : 'Unknown'}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card
              title="Session"
              extra={
                <Button danger type="link" onClick={handleSignOut}>
                  Sign Out
                </Button>
              }
            >
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Username">
                  {claims?.sub || 'Unknown'}
                </Descriptions.Item>
                <Descriptions.Item label="Token Expires">
                  {expiryLabel}
                </Descriptions.Item>
                <Descriptions.Item label="Token Present">
                  {token ? <Tag color="success">Yes</Tag> : <Tag>No</Tag>}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title="Runtime">
              {isError ? (
                <Alert
                  type="error"
                  showIcon
                  message="Could not load runtime status"
                />
              ) : (
                <Row gutter={[12, 12]}>
                  <Col span={12}>
                    <Statistic
                      title="Tasks"
                      value={status?.task_count ?? (isLoading ? undefined : 0)}
                      loading={isLoading}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="Active Timers"
                      value={status?.active_timers ?? (isLoading ? undefined : 0)}
                      loading={isLoading}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="Recent Failures"
                      value={status?.recent_failures_24h ?? (isLoading ? undefined : 0)}
                      loading={isLoading}
                    />
                  </Col>
                </Row>
              )}
            </Card>
          </Col>
        </Row>

        <Card title="Global Hooks">
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            Global hooks run for every task when the selected event type matches.
          </Typography.Text>
          <HookTable global />
        </Card>
      </Space>
    </AppLayout>
  );
}
