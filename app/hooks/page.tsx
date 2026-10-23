'use client';

import React, { Suspense } from 'react';
import { AppShell } from '@/components/Layout/AppShell';
import { HooksScreen } from '@/components/Hooks/HooksScreen';

export default function HooksPage() {
  return (
    <AppShell header={{ crumbs: [{ label: 'Hooks' }] }}>
      <Suspense fallback={null}>
        <HooksScreen />
      </Suspense>
    </AppShell>
  );
}
