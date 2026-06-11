'use client';

import React, { useMemo } from 'react';
import { Sparkline } from '@/components/ui/Sparkline';
import { useDashboardActivity, useDashboardSummary } from '@/hooks/useDashboard';

function StatCard({
  label,
  value,
  unit,
  delta,
  deltaDir,
  sparkData,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  delta?: string;
  deltaDir?: 'up' | 'down';
  sparkData?: number[];
}) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">
        <span className="mono">{value}</span>
        {unit && <span className="unit">{unit}</span>}
      </div>
      {delta && (
        <div className="stat-delta">
          <span className={deltaDir || ''}>{delta}</span>
          <span style={{ color: 'var(--text-faint)' }}>vs prev period</span>
        </div>
      )}
      {sparkData && sparkData.length > 0 && (
        <div className="stat-spark">
          <Sparkline data={sparkData} width={70} height={30} />
        </div>
      )}
    </div>
  );
}

export function StatsCards() {
  const { summary } = useDashboardSummary();
  const { activity: hourly } = useDashboardActivity('24h');
  const { activity: weekly } = useDashboardActivity('7d');

  const hourlyBuckets = useMemo(() => hourly?.buckets ?? [], [hourly]);
  const weeklyBuckets = useMemo(() => weekly?.buckets ?? [], [weekly]);

  const sparkSuccess = useMemo(() => hourlyBuckets.map((b) => b.counts.success), [hourlyBuckets]);
  const sparkActivity = useMemo(
    () => hourlyBuckets.map((b) => b.counts.success + b.counts.failed + b.counts.running),
    [hourlyBuckets],
  );
  const sparkRate = useMemo(
    () =>
      weeklyBuckets.map((b) => {
        const t = b.counts.success + b.counts.failed;
        return t ? (b.counts.success / t) * 100 : 95;
      }),
    [weeklyBuckets],
  );
  const sparkFailed = useMemo(
    () => hourlyBuckets.map((b) => b.counts.failed + 0.1),
    [hourlyBuckets],
  );

  const successRate = summary?.success_rate;
  const successRateDisplay =
    typeof successRate === 'number' && Number.isFinite(successRate) ? successRate.toFixed(1) : '—';

  return (
    <div className="stats-row">
      <StatCard label="Total tasks" value={summary?.task_count ?? '—'} sparkData={sparkActivity} />
      <StatCard
        label="Runs · 24h"
        value={summary ? summary.runs_24h.toLocaleString('en-US') : '—'}
        sparkData={sparkSuccess}
      />
      <StatCard
        label="Success rate"
        value={successRateDisplay}
        unit="%"
        sparkData={sparkRate}
      />
      <StatCard label="Active timers" value={summary?.active_timers ?? '—'} sparkData={sparkFailed} />
    </div>
  );
}
