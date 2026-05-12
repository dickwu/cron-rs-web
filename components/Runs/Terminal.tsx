'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/icons';
import type { JobRun } from '@/lib/types';

interface Line {
  text: string;
  kind: 'stdout' | 'stderr';
}

function buildLinesFrom(run: JobRun): Line[] {
  const out = (run.stdout || '').split('\n').filter(Boolean).map((t) => ({
    text: t,
    kind: 'stdout' as const,
  }));
  const err = (run.stderr || '').split('\n').filter(Boolean).map((t) => ({
    text: t,
    kind: 'stderr' as const,
  }));
  return [...out, ...err];
}

export function Terminal({ run }: { run: JobRun }) {
  const [lines, setLines] = useState<Line[]>(() => buildLinesFrom(run));
  const [search, setSearch] = useState('');
  const [paused, setPaused] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  useEffect(() => {
    setLines(buildLinesFrom(run));
  }, [run.id, run.stdout, run.stderr]);

  useLayoutEffect(() => {
    if (autoScrollRef.current && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [lines]);

  const onScroll = () => {
    if (!bodyRef.current) return;
    const el = bodyRef.current;
    autoScrollRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  };

  const lower = search.trim().toLowerCase();
  const isRunning = run.status === 'running';

  return (
    <div className="terminal">
      <div className="terminal-head">
        <div className="dots">
          <span className="d" />
          <span className="d" />
          <span className="d" />
        </div>
        <span className="title mono">~/cron-rs/run/{run.id}</span>
        <div className="right">
          <input
            className="input mono"
            placeholder="grep…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              height: 22,
              padding: '0 8px',
              fontSize: 11,
              width: 160,
              background: 'rgba(255,255,255,0.05)',
              borderColor: 'rgba(255,255,255,0.12)',
              color: '#fff',
            }}
          />
          <button
            className="btn ghost sm"
            onClick={() => setPaused((p) => !p)}
            style={{ color: '#fff' }}
          >
            {paused ? (
              <>
                <Icon.play size={11} /> Resume
              </>
            ) : (
              <>
                <Icon.pause size={11} /> Pause
              </>
            )}
          </button>
          {isRunning && (
            <span className="live">
              <span className="pulse" /> live
            </span>
          )}
        </div>
      </div>
      <div className="terminal-body" ref={bodyRef} onScroll={onScroll}>
        {lines.map((l, i) => {
          const hit = lower && l.text.toLowerCase().includes(lower);
          return (
            <div key={i} className={`ln ${l.kind} ${hit ? 'search-hit' : ''}`}>
              <span className="num">{i + 1}</span>
              <span className="txt">{l.text}</span>
            </div>
          );
        })}
        {isRunning && !paused && (
          <div className="ln">
            <span className="num">{lines.length + 1}</span>
            <span className="txt">
              <span className="terminal-cursor" />
            </span>
          </div>
        )}
        {lines.length === 0 && !isRunning && (
          <div
            style={{
              color: 'var(--terminal-dim)',
              fontStyle: 'italic',
              padding: '10px 0',
            }}
          >
            (no output)
          </div>
        )}
      </div>
    </div>
  );
}
