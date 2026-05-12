'use client';

import React from 'react';
import { AppShell } from '@/components/Layout/AppShell';
import { HooksScreen } from '@/components/Hooks/HooksScreen';

export default function HooksPage() {
  return (
    <AppShell header={{ crumbs: [{ label: 'Hooks' }] }}>
      <HooksScreen />
    </AppShell>
  );
}
