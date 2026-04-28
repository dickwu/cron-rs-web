'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button, Grid, Layout, Menu, Typography } from 'antd';
import {
  DashboardOutlined,
  ScheduleOutlined,
  HistoryOutlined,
  ApiOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { AuthGuard } from './AuthGuard';
import { useSSE } from '@/hooks/useSSE';
import { clearToken } from '@/lib/auth';

const { Sider, Header, Content } = Layout;
const { useBreakpoint } = Grid;

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/tasks', icon: <ScheduleOutlined />, label: 'Tasks' },
  { key: '/runs', icon: <HistoryOutlined />, label: 'Runs' },
  { key: '/hooks', icon: <ApiOutlined />, label: 'Hooks' },
  { key: '/settings', icon: <SettingOutlined />, label: 'Settings' },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const screens = useBreakpoint();
  const [collapsed, setCollapsed] = useState(false);
  const { connectionStatus } = useSSE();
  const isMobile = !screens.md;

  useEffect(() => {
    if (screens.lg === false && screens.md === true) {
      setCollapsed(true);
    }
  }, [screens.lg, screens.md]);

  const selectedKey = menuItems.find(
    (item) => item.key !== '/' && pathname.startsWith(item.key)
  )?.key || '/';

  const handleMenuClick = (info: { key: string }) => {
    router.push(info.key);
  };

  const handleLogout = () => {
    clearToken();
    router.push('/login');
  };

  const sseLabel =
    connectionStatus === 'connected'
      ? 'Live'
      : connectionStatus === 'connecting'
      ? 'Connecting'
      : 'Disconnected';

  const sseIndicator = (
    <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: 16 }}>
      <span className={`sse-indicator sse-indicator-${connectionStatus}`} />
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {sseLabel}
      </Typography.Text>
    </span>
  );

  if (isMobile) {
    return (
      <AuthGuard>
        <Layout style={{ minHeight: '100vh' }}>
          <Header
            style={{
              background: '#fff',
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #f0f0f0',
              position: 'sticky',
              top: 0,
              zIndex: 10,
            }}
          >
            <Typography.Title level={5} style={{ margin: 0 }}>
              cron-rs
            </Typography.Title>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {sseIndicator}
              <LogoutOutlined onClick={handleLogout} style={{ fontSize: 16, cursor: 'pointer' }} />
            </span>
          </Header>
          <Content style={{ padding: 16, flex: 1, overflow: 'auto', paddingBottom: 72 }}>
            {children}
          </Content>
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: '#fff',
              borderTop: '1px solid #f0f0f0',
              display: 'flex',
              justifyContent: 'space-around',
              padding: '8px 0',
              zIndex: 10,
            }}
          >
            {menuItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => router.push(item.key)}
                style={{
                  alignItems: 'center',
                  background: 'transparent',
                  border: 0,
                  color: selectedKey === item.key ? '#1677ff' : '#8c8c8c',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  fontSize: 12,
                  minWidth: 64,
                  padding: '4px 0',
                }}
              >
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: 20 }}>{item.icon}</span>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </Layout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={220}
          collapsedWidth={64}
          style={{
            background: '#001529',
            overflow: 'auto',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 11,
          }}
        >
          <div
            style={{
              height: 64,
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: collapsed ? 0 : '0 24px',
            }}
          >
            <Typography.Title
              level={4}
              style={{ color: '#fff', margin: 0, whiteSpace: 'nowrap' }}
            >
              {collapsed ? 'cr' : 'cron-rs'}
            </Typography.Title>
          </div>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[selectedKey]}
            items={menuItems}
            onClick={handleMenuClick}
            style={{ borderRight: 0 }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 16,
              width: '100%',
              textAlign: 'center',
            }}
          >
            <LogoutOutlined
              onClick={handleLogout}
              style={{ color: '#8c8c8c', fontSize: 16, cursor: 'pointer' }}
            />
          </div>
        </Sider>
        <Layout style={{ marginLeft: collapsed ? 64 : 220 }}>
          <Header
            style={{
              background: '#fff',
              padding: '0 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #f0f0f0',
            }}
          >
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
            />
            {sseIndicator}
          </Header>
          <Content style={{ padding: 24, minHeight: 280 }}>{children}</Content>
        </Layout>
      </Layout>
    </AuthGuard>
  );
}
