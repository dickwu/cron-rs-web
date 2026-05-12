'use client';

import React, { useMemo, useState } from 'react';
import { Card, Empty, Segmented, Skeleton, Space, Tooltip, Typography } from 'antd';
import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { StatusBadge } from '@/components/Dashboard/RecentRuns';
import { useRuns } from '@/hooks/useRuns';
import { useTasks } from '@/hooks/useTasks';
import { fmtDateTime } from '@/lib/date';
import { currentPathWithSearch, hrefWithReturnTo } from '@/lib/navigation';
import type { JobRun, Task } from '@/lib/types';

const Column = dynamic(
  () => import('@ant-design/charts').then((mod) => mod.Column),
  { ssr: false, loading: () => <Skeleton active paragraph={{ rows: 6 }} /> }
);

type Range = '24h' | '7d' | '30d';
type Bucket = 'success' | 'failed' | 'skipped' | 'running';

// Bottom-up stacking order; success on top keeps the green band visually contiguous.
const BUCKET_ORDER: Bucket[] = ['failed', 'skipped', 'running', 'success'];

const BUCKET_LABEL: Record<Bucket, string> = {
  success: 'Success',
  failed: 'Failed',
  skipped: 'Skipped',
  running: 'In flight',
};

const BUCKET_COLOR: Record<Bucket, string> = {
  success: '#52c41a',
  failed: '#ff4d4f',
  skipped: '#bfbfbf',
  running: '#1677ff',
};

function classify(status: JobRun['status']): Bucket | null {
  switch (status) {
    case 'success':
      return 'success';
    case 'failed':
    case 'timeout':
    case 'crashed':
      return 'failed';
    case 'skipped':
      return 'skipped';
    case 'running':
    case 'retrying':
      return 'running';
    default:
      return null;
  }
}

// Mirrors lib/date.ts parseAsUtcIfNaive: timestamps without an explicit zone
// marker are UTC, not local — Chrome/Firefox would otherwise parse them as local.
function parseTs(input: string): Date | null {
  const hasTz = /(Z|[+-]\d{2}:?\d{2})$/.test(input);
  const isoLike = input.includes(' ') && !input.includes('T') ? input.replace(' ', 'T') : input;
  const d = new Date(hasTz ? isoLike : `${isoLike}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

interface RangeMeta {
  hours: number;
  granularity: 'hour' | 'day';
  formatLabel: (date: Date) => string;
}

const RANGE_META: Record<Range, RangeMeta> = {
  '24h': {
    hours: 24,
    granularity: 'hour',
    formatLabel: (d) => `${String(d.getHours()).padStart(2, '0')}:00`,
  },
  '7d': {
    hours: 24 * 7,
    granularity: 'day',
    formatLabel: (d) => `${d.getMonth() + 1}/${d.getDate()}`,
  },
  '30d': {
    hours: 24 * 30,
    granularity: 'day',
    formatLabel: (d) => `${d.getMonth() + 1}/${d.getDate()}`,
  },
};

function bucketKey(date: Date, granularity: 'hour' | 'day'): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  if (granularity === 'hour') {
    return `${y}-${m}-${d}T${String(date.getHours()).padStart(2, '0')}`;
  }
  return `${y}-${m}-${d}`;
}

interface TaskBreakdown {
  taskId: string;
  total: number;
  counts: Record<Bucket, number>;
}

interface ChartDatum {
  label: string;
  count: number;
  type: string;
}

interface Aggregated {
  chartData: ChartDatum[];
  total: number;
  success: number;
  failed: number;
  skipped: number;
  running: number;
  successRate: number | null;
  topTasks: TaskBreakdown[];
  failedRuns: JobRun[];
}

function aggregate(runs: JobRun[], range: Range): Aggregated {
  const meta = RANGE_META[range];
  const now = new Date();
  const cutoff = new Date(now.getTime() - meta.hours * 3_600_000);
  const stepMs = meta.granularity === 'hour' ? 3_600_000 : 86_400_000;
  const slots = meta.granularity === 'hour' ? meta.hours : meta.hours / 24;

  let cursor = new Date(now);
  if (meta.granularity === 'hour') {
    cursor.setMinutes(0, 0, 0);
  } else {
    cursor.setHours(0, 0, 0, 0);
  }
  cursor = new Date(cursor.getTime() - (slots - 1) * stepMs);

  const buckets = new Map<
    string,
    { counts: Record<Bucket, number>; label: string }
  >();
  for (let i = 0; i < slots; i++) {
    const key = bucketKey(cursor, meta.granularity);
    buckets.set(key, {
      counts: { success: 0, failed: 0, skipped: 0, running: 0 },
      label: meta.formatLabel(cursor),
    });
    cursor = new Date(cursor.getTime() + stepMs);
  }

  let total = 0;
  let success = 0;
  let failed = 0;
  let skipped = 0;
  let running = 0;
  const perTask = new Map<string, TaskBreakdown>();
  const failedRuns: JobRun[] = [];

  for (const run of runs) {
    const ts = parseTs(run.started_at);
    if (!ts || ts < cutoff) continue;
    const bucket = classify(run.status);
    if (!bucket) continue;

    const entry = buckets.get(bucketKey(ts, meta.granularity));
    if (entry) entry.counts[bucket] += 1;

    total += 1;
    if (bucket === 'success') success += 1;
    else if (bucket === 'failed') {
      failed += 1;
      failedRuns.push(run);
    } else if (bucket === 'skipped') skipped += 1;
    else running += 1;

    let agg = perTask.get(run.task_id);
    if (!agg) {
      agg = {
        taskId: run.task_id,
        total: 0,
        counts: { success: 0, failed: 0, skipped: 0, running: 0 },
      };
      perTask.set(run.task_id, agg);
    }
    agg.total += 1;
    agg.counts[bucket] += 1;
  }

  const chartData: ChartDatum[] = [];
  for (const entry of buckets.values()) {
    for (const b of BUCKET_ORDER) {
      chartData.push({
        label: entry.label,
        count: entry.counts[b],
        type: BUCKET_LABEL[b],
      });
    }
  }

  const finished = success + failed;
  const successRate = finished > 0 ? (success / finished) * 100 : null;

  // Rank by failure count first so anything broken floats to the top, then by volume.
  const topTasks = [...perTask.values()]
    .sort((a, b) => {
      if (b.counts.failed !== a.counts.failed) return b.counts.failed - a.counts.failed;
      return b.total - a.total;
    })
    .slice(0, 5);

  return {
    chartData,
    total,
    success,
    failed,
    skipped,
    running,
    successRate,
    topTasks,
    failedRuns,
  };
}

const RANGE_OPTIONS: { label: string; value: Range }[] = [
  { label: '24h', value: '24h' },
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
];

function StackedBar({
  counts,
  total,
}: {
  counts: Record<Bucket, number>;
  total: number;
}) {
  if (total === 0) return null;
  return (
    <div
      style={{
        display: 'flex',
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
        background: '#f0f0f0',
        width: '100%',
      }}
    >
      {BUCKET_ORDER.slice()
        .reverse()
        .map((b) => {
          const value = counts[b];
          if (!value) return null;
          return (
            <Tooltip key={b} title={`${BUCKET_LABEL[b]}: ${value}`}>
              <div
                style={{
                  width: `${(value / total) * 100}%`,
                  background: BUCKET_COLOR[b],
                }}
              />
            </Tooltip>
          );
        })}
    </div>
  );
}

interface TopTasksProps {
  topTasks: TaskBreakdown[];
  taskMap: Record<string, Task>;
  onSelect: (taskId: string) => void;
}

function TopTasks({ topTasks, taskMap, onSelect }: TopTasksProps) {
  if (topTasks.length === 0) return null;
  return (
    <div style={{ marginTop: 20, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
      <Typography.Text
        type="secondary"
        style={{ fontSize: 12, display: 'block', marginBottom: 10 }}
      >
        Top tasks in this window
      </Typography.Text>
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        {topTasks.map((t) => {
          const task = taskMap[t.taskId];
          const label = task?.name ?? t.taskId.slice(0, 8);
          return (
            <div
              key={t.taskId}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(t.taskId)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(t.taskId);
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: 'pointer',
                fontSize: 13,
                padding: '4px 0',
              }}
            >
              <Typography.Text
                ellipsis={{ tooltip: task?.command ?? t.taskId }}
                style={{ flex: '1 1 0', minWidth: 0 }}
              >
                {label}
              </Typography.Text>
              <div style={{ flex: '0 0 96px' }}>
                <StackedBar counts={t.counts} total={t.total} />
              </div>
              <Typography.Text
                type="secondary"
                style={{ flex: '0 0 64px', fontSize: 12, textAlign: 'right' }}
              >
                {t.total} run{t.total === 1 ? '' : 's'}
              </Typography.Text>
              <div style={{ flex: '0 0 60px', textAlign: 'right' }}>
                {t.counts.failed > 0 ? (
                  <Typography.Text type="danger" style={{ fontSize: 12 }}>
                    {t.counts.failed} fail{t.counts.failed === 1 ? '' : 's'}
                  </Typography.Text>
                ) : null}
              </div>
            </div>
          );
        })}
      </Space>
    </div>
  );
}

interface RecentFailuresProps {
  failedRuns: JobRun[];
  taskMap: Record<string, Task>;
  onSelect: (runId: string) => void;
}

function RecentFailures({ failedRuns, taskMap, onSelect }: RecentFailuresProps) {
  if (failedRuns.length === 0) return null;
  // Newest first; cap at 5 so the card doesn't get unwieldy.
  const rows = failedRuns.slice(0, 5);
  return (
    <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
      <Space
        size={8}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Recent failures
        </Typography.Text>
        {failedRuns.length > rows.length && (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            showing 5 of {failedRuns.length}
          </Typography.Text>
        )}
      </Space>
      <Space direction="vertical" size={6} style={{ width: '100%' }}>
        {rows.map((r) => {
          const task = taskMap[r.task_id];
          const label = task?.name ?? r.task_id.slice(0, 8);
          return (
            <div
              key={r.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(r.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(r.id);
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: 'pointer',
                fontSize: 13,
                padding: '4px 0',
              }}
            >
              <Typography.Text
                ellipsis={{ tooltip: r.task_id }}
                style={{ flex: '1 1 0', minWidth: 0 }}
              >
                {label}
              </Typography.Text>
              <div style={{ flex: '0 0 auto' }}>
                <StatusBadge status={r.status} />
              </div>
              <Typography.Text
                type="secondary"
                style={{ flex: '0 0 auto', fontSize: 12 }}
              >
                {fmtDateTime(r.started_at)}
              </Typography.Text>
              <Typography.Text
                type="secondary"
                className="mono"
                style={{ flex: '0 0 36px', fontSize: 12, textAlign: 'right' }}
              >
                {r.exit_code !== null ? r.exit_code : '-'}
              </Typography.Text>
            </div>
          );
        })}
      </Space>
    </div>
  );
}

export function RunChart() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [range, setRange] = useState<Range>('7d');
  // No explicit limit — the daemon caps the response when `since` is set.
  const { runs, isLoading, isError } = useRuns({ since: range });
  const { tasks } = useTasks();

  const taskMap = useMemo<Record<string, Task>>(() => {
    const map: Record<string, Task> = {};
    for (const task of tasks) map[task.id] = task;
    return map;
  }, [tasks]);

  const aggregated = useMemo(() => aggregate(runs, range), [runs, range]);
  const { chartData, total, failed, successRate, topTasks, failedRuns } = aggregated;

  const summary =
    isLoading || isError ? null : (
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {total} run{total === 1 ? '' : 's'}
        {successRate !== null && (
          <>
            {' · '}
            <span
              style={{
                color:
                  failed === 0
                    ? '#52c41a'
                    : successRate >= 90
                      ? '#faad14'
                      : '#ff4d4f',
              }}
            >
              {successRate.toFixed(1)}% success
            </span>
          </>
        )}
      </Typography.Text>
    );

  const header = (
    <Space
      size={[12, 8]}
      style={{
        width: '100%',
        justifyContent: 'space-between',
        display: 'flex',
        flexWrap: 'wrap',
      }}
    >
      <Typography.Text strong>Run Activity</Typography.Text>
      <Space size={12} wrap>
        {summary}
        <Segmented
          size="small"
          value={range}
          onChange={(v) => setRange(v as Range)}
          options={RANGE_OPTIONS}
        />
      </Space>
    </Space>
  );

  if (isLoading) {
    return (
      <Card title={header}>
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    );
  }

  if (isError) {
    return (
      <Card title={header}>
        <Typography.Text type="secondary">Chart unavailable</Typography.Text>
      </Card>
    );
  }

  const returnTo = currentPathWithSearch(pathname, searchParams);
  const handleSelectTask = (taskId: string) => {
    router.push(hrefWithReturnTo(`/tasks?id=${taskId}`, returnTo));
  };
  const handleSelectRun = (runId: string) => {
    router.push(hrefWithReturnTo(`/runs?id=${runId}`, returnTo));
  };

  return (
    <Card title={header}>
      {total === 0 ? (
        <Empty
          description="No runs in this window"
          style={{ padding: '24px 0' }}
        />
      ) : (
        <Column
          data={chartData}
          xField="label"
          yField="count"
          colorField="type"
          stack
          scale={{
            color: {
              domain: BUCKET_ORDER.map((b) => BUCKET_LABEL[b]),
              range: BUCKET_ORDER.map((b) => BUCKET_COLOR[b]),
            },
            x: { paddingInner: 0.25 },
          }}
          height={240}
          axis={{
            y: { title: null, tickCount: 4 },
            x: { title: null },
          }}
          legend={{
            color: { position: 'top', layout: { justifyContent: 'flex-end' } },
          }}
          tooltip={{
            title: (d: ChartDatum) => d.label,
            items: [{ channel: 'y', valueFormatter: (v: number) => String(v) }],
          }}
          interaction={{
            tooltip: { shared: true },
            elementHighlight: { background: true },
          }}
        />
      )}
      <TopTasks
        topTasks={topTasks}
        taskMap={taskMap}
        onSelect={handleSelectTask}
      />
      <RecentFailures
        failedRuns={failedRuns}
        taskMap={taskMap}
        onSelect={handleSelectRun}
      />
    </Card>
  );
}
