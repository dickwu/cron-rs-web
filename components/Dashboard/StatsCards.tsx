'use client';

import React, { useMemo } from 'react';
import { Sparkline } from '@/components/ui/Sparkline';
import { useDashboardSummary } from '@/hooks/useDashboard';
import { useRunSummaries } from '@/hooks/useRuns';
import { buildBuckets } from '@/lib/analytics';

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
  const since = useMemo(() => new Date(Date.now() - 7 * 86400 * 1000).toISOString(), []);
  const { runs } = useRunSummaries({ since });

  const sparkSuccess = useMemo(() => buildBuckets(runs, '24h').map((b) => b.success), [runs]);
  const sparkActivity = useMemo(
    () => buildBuckets(runs, '24h').map((b) => b.success + b.failed + b.running),
    [runs],
  );
  const sparkRate = useMemo(
    () =>
      buildBuckets(runs, '7d').map((b) => {
        const t = b.success + b.failed;
        return t ? (b.success / t) * 100 : 95;
      }),
    [runs],
  );
  const sparkFailed = useMemo(() => buildBuckets(runs, '24h').map((b) => b.failed + 0.1), [runs]);

  const successRate = summary?.success_rate;
  const successRateDisplay =
    typeof successRate === 'number' && Number.isFinite(successRate) ? successRate.toFixed(1) : '—';

  return (
    <div className="stats-row">
      <StatCard label="Total tasks" value={summary?.task_count ?? '—'} sparkData={sparkActivity} />
      <StatCard label="Runs · 24h" value={summary?.runs_24h ?? '—'} sparkData={sparkSuccess} />
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
