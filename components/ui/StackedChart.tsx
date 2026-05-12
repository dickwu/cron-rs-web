import React from 'react';

export interface ChartBucket {
  label: string;
  success: number;
  failed: number;
  skipped: number;
  running: number;
}

export function StackedChart({
  buckets,
  height = 240,
  mode = 'bars',
}: {
  buckets: ChartBucket[];
  height?: number;
  mode?: 'bars' | 'lines' | 'heatmap';
}) {
  const safeBuckets = buckets.length ? buckets : [{ label: '', success: 0, failed: 0, skipped: 0, running: 0 }];
  const maxTotal = Math.max(
    1,
    ...safeBuckets.map((b) => b.success + b.failed + b.skipped + b.running),
  );
  const W = 100;
  const barW = W / safeBuckets.length;
  const padding = 0.18;

  if (mode === 'lines') {
    const sPts = safeBuckets.map((b, i) => {
      const x = (i / Math.max(1, safeBuckets.length - 1)) * 100;
      const y = 100 - (b.success / maxTotal) * 92 - 4;
      return [x, y] as const;
    });
    const fPts = safeBuckets.map((b, i) => {
      const x = (i / Math.max(1, safeBuckets.length - 1)) * 100;
      const y = 100 - (b.failed / maxTotal) * 92 - 4;
      return [x, y] as const;
    });
    const pathOf = (pts: readonly (readonly [number, number])[]) =>
      pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(2) + ',' + p[1].toFixed(2)).join(' ');
    return (
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ width: '100%', height }}
        aria-hidden="true"
      >
        {[0.25, 0.5, 0.75].map((g) => (
          <line
            key={g}
            x1="0"
            x2="100"
            y1={g * 100}
            y2={g * 100}
            stroke="var(--grid-line)"
            strokeWidth="0.4"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <path d={pathOf(sPts)} fill="none" stroke="var(--c-success)" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
        <path d={pathOf(fPts)} fill="none" stroke="var(--c-error)" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
        {sPts.map((p, i) => (
          <circle
            key={'s' + i}
            cx={p[0]}
            cy={p[1]}
            r="0.9"
            fill="var(--c-success)"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    );
  }
  if (mode === 'heatmap') {
    const rows: Array<keyof Omit<ChartBucket, 'label'>> = ['success', 'failed', 'skipped', 'running'];
    const colorOf = (k: keyof Omit<ChartBucket, 'label'>, v: number, max: number) => {
      const c = {
        success: '22, 163, 74',
        failed: '220, 38, 38',
        skipped: '113, 113, 122',
        running: '8, 145, 178',
      }[k];
      const a = Math.min(1, v / Math.max(1, max));
      return `rgba(${c}, ${a})`;
    };
    const maxAny = Math.max(1, ...safeBuckets.flatMap((b) => rows.map((k) => b[k])));
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateRows: `repeat(${rows.length}, 1fr)`,
          gap: 4,
          height,
          padding: '6px 0',
        }}
      >
        {rows.map((k) => (
          <div key={k} style={{ display: 'flex', gap: 2, alignItems: 'stretch' }}>
            <div
              style={{
                width: 56,
                fontSize: 11,
                color: 'var(--text-muted)',
                textTransform: 'capitalize',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {k}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${safeBuckets.length}, 1fr)`,
                gap: 2,
                flex: 1,
              }}
            >
              {safeBuckets.map((b, i) => (
                <div
                  key={i}
                  title={`${b.label} · ${k}: ${b[k]}`}
                  style={{
                    background: b[k] === 0 ? 'var(--border-subtle)' : colorOf(k, b[k], maxAny),
                    borderRadius: 2,
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ width: '100%', height }}
      aria-hidden="true"
    >
      {[0.25, 0.5, 0.75].map((g) => (
        <line
          key={g}
          x1="0"
          x2="100"
          y1={g * 100}
          y2={g * 100}
          stroke="var(--grid-line)"
          strokeWidth="0.4"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {safeBuckets.map((b, i) => {
        const x = i * barW + barW * padding;
        const w = barW * (1 - padding * 2);
        const stack: Array<{ v: number; c: string }> = [
          { v: b.success, c: 'var(--c-success)' },
          { v: b.failed, c: 'var(--c-error)' },
          { v: b.running, c: 'var(--c-running)' },
          { v: b.skipped, c: 'var(--c-neutral)' },
        ];
        let y = 100;
        return (
          <g key={i}>
            {stack.map((s, j) => {
              if (!s.v) return null;
              const h = (s.v / maxTotal) * 92;
              y -= h;
              return <rect key={j} x={x} y={y} width={w} height={h} fill={s.c} rx="0.4" />;
            })}
          </g>
        );
      })}
    </svg>
  );
}
