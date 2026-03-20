'use client';

import React from 'react';
import { ConfigProvider, App } from 'antd';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6,
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontFamilyCode: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
          colorBgLayout: '#f5f5f5',
        },
      }}
    >
      <App>{children}</App>
    </ConfigProvider>
  );
}
