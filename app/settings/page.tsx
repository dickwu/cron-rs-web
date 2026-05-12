'use client';

import React from 'react';
import { AppShell } from '@/components/Layout/AppShell';
import { SettingsScreen } from '@/components/Settings/SettingsScreen';

export default function SettingsPage() {
  return (
    <AppShell header={{ crumbs: [{ label: 'Settings' }] }}>
      <SettingsScreen />
    </AppShell>
  );
}
