'use client';

import React, { Suspense } from 'react';
import { Spin } from 'antd';
import RunsPageContent from './RunsPageContent';

export default function RunsPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>}>
      <RunsPageContent />
    </Suspense>
  );
}
