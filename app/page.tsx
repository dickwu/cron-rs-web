'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSWRConfig } from 'swr';
import { AppShell } from '@/components/Layout/AppShell';
import { Icon } from '@/components/ui/icons';
import { toast } from '@/components/ui/Toaster';
import { StatsCards } from '@/components/Dashboard/StatsCards';
import { ChartCard } from '@/components/Dashboard/ChartCard';
import { Upcoming } from '@/components/Dashboard/Upcoming';
import { RecentRunsCard } from '@/components/Dashboard/RecentRuns';
import { RecentFailures } from '@/components/Dashboard/RecentFailures';
import { HeatmapCard } from '@/components/Dashboard/HeatmapCard';
import { TopTasksCard } from '@/components/Dashboard/TopTasks';
import { EmptyState } from '@/components/Dashboard/EmptyState';
import { TaskFormDrawer } from '@/components/Tasks/TaskFormDrawer';
import { useDashboardSummary } from '@/hooks/useDashboard';

function DashboardInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { mutate } = useSWRConfig();
  const { summary } = useDashboardSummary();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (params.get('new') === '1') setDrawerOpen(true);
  }, [params]);

  const hasTasks = (summary?.task_count ?? 0) > 0;

  const handleSuccess = () => {
    setDrawerOpen(false);
    mutate((key) => typeof key === 'string' && key.startsWith('/api/v1/'));
    router.push('/tasks');
  };

  const header = {
    crumbs: [{ label: 'Dashboard' as const }],
    actions: (
      <>
        <button
          className="btn"
          onClick={() => {
            mutate((key) => typeof key === 'string' && key.startsWith('/api/v1/'));
            toast('Refreshed', 'info');
          }}
        >
          <Icon.refresh size={13} /> Refresh
        </button>
        <button className="btn primary" onClick={() => setDrawerOpen(true)}>
          <Icon.plus size={13} /> New task
        </button>
      </>
    ),
  };

  return (
    <AppShell header={header}>
      {!summary ? null : !hasTasks ? (
        <EmptyState onCreate={() => setDrawerOpen(true)} />
      ) : (
        <>
          <div className="page-header">
            <div>
              <div className="page-title">Dashboard</div>
              <div className="page-subtitle">
                Live monitoring · {summary.task_count} task
                {summary.task_count === 1 ? '' : 's'} · {summary.active_timers} timer
                {summary.active_timers === 1 ? '' : 's'} active
              </div>
            </div>
          </div>

          <StatsCards />

          <div className="grid-2 mb-4">
            <ChartCard />
            <Upcoming />
          </div>

          <div className="grid-2 mb-4">
            <RecentRunsCard />
            <RecentFailures />
          </div>

          <div className="grid-2 mb-4">
            <HeatmapCard />
            <TopTasksCard />
          </div>
        </>
      )}

      <TaskFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={handleSuccess}
      />
    </AppShell>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: 80,
            color: 'var(--text-muted)',
          }}
        >
          <Icon.spinner size={22} />
        </div>
      }
    >
      <DashboardInner />
    </Suspense>
  );
}
