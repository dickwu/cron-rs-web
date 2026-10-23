'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/icons';
import { copyText } from '@/lib/clipboard';
import { toast } from '@/components/ui/Toaster';
import type { JobRun } from '@/lib/types';

interface Line {
  text: string;
  kind: 'stdout' | 'stderr' | 'section';
  /** 1-based line number within its stream (absent for section headers). */
  num?: number;
}

/**
 * Split captured output into lines, keeping blank lines (they are often
 * meaningful separators in logs). Only the single empty entry produced by a
 * trailing newline is dropped; CRLF endings are normalized.
 */
function splitOutput(text: string | null | undefined): string[] {
  if (!text) return [];
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

/**
 * The daemon stores stdout and stderr as two separate captures with no
 * timing information, so their relative order is unknown. Rather than
 * pretending to interleave them, show stdout first and stderr in its own
 * clearly labelled section.
 */
function buildLinesFrom(run: JobRun): Line[] {
  const out = splitOutput(run.stdout);
  const err = splitOutput(run.stderr);
  const lines: Line[] = [];
  if (out.length && err.length) lines.push({ text: 'stdout', kind: 'section' });
  out.forEach((text, i) => lines.push({ text, kind: 'stdout', num: i + 1 }));
  if (err.length) {
    lines.push({ text: 'stderr', kind: 'section' });
    err.forEach((text, i) => lines.push({ text, kind: 'stderr', num: i + 1 }));
  }
  return lines;
}

function copyableOutput(run: JobRun): string {
  const out = run.stdout || '';
  const err = run.stderr || '';
  if (out && err) {
    return `===== stdout =====\n${out.replace(/\n$/, '')}\n===== stderr =====\n${err}`;
  }
  return out || err;
}

export function Terminal({ run }: { run: JobRun }) {
  const [lines, setLines] = useState<Line[]>(() => buildLinesFrom(run));
  const [search, setSearch] = useState('');
  const [paused, setPaused] = useState(false);
  const [copied, setCopied] = useState(false);
  const [following, setFollowing] = useState(true);
  const bodyRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);
  const copyTimer = useRef<number | null>(null);

  // While paused, freeze the displayed output so it can be read/scrolled
  // without the live tail jumping; resuming catches up to the latest. The
  // freeze only applies mid-run — once finished we always show the final
  // output (the Pause control is hidden then, so it can't be un-frozen).
  useEffect(() => {
    if (paused && run.status === 'running') return;
    setLines(buildLinesFrom(run));
  }, [run.id, run.stdout, run.stderr, run.status, paused]);

  useEffect(
    () => () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    },
    [],
  );

  const handleCopy = async () => {
    const text = copyableOutput(run);
    const ok = await copyText(text);
    if (!ok) {
      toast('Copy failed', 'error');
      return;
    }
    setCopied(true);
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 1500);
  };

  useLayoutEffect(() => {
    if (autoScrollRef.current && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [lines]);

  const onScroll = () => {
    if (!bodyRef.current) return;
    const el = bodyRef.current;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    autoScrollRef.current = nearBottom;
    setFollowing(nearBottom);
  };

  const jumpToLatest = () => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
    autoScrollRef.current = true;
    setFollowing(true);
  };

  const lower = search.trim().toLowerCase();
  const isRunning = run.status === 'running';
  const hasOutput = Boolean(run.stdout || run.stderr);
  const contentLines = lines.filter((l) => l.kind !== 'section').length;

  return (
    <div className="terminal" style={{ position: 'relative' }}>
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
            onClick={handleCopy}
            disabled={!hasOutput}
            title="Copy output to clipboard"
            style={{ color: '#fff' }}
          >
            {copied ? (
              <>
                <Icon.check size={11} /> Copied
              </>
            ) : (
              <>
                <Icon.copy size={11} /> Copy
              </>
            )}
          </button>
          {isRunning && (
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
          )}
          {isRunning &&
            (paused ? (
              <span className="live" style={{ color: 'var(--terminal-dim)' }}>
                paused
              </span>
            ) : (
              <span className="live">
                <span className="pulse" /> live · {contentLines}
              </span>
            ))}
        </div>
      </div>
      <div className="terminal-body" ref={bodyRef} onScroll={onScroll}>
        {lines.map((l, i) => {
          if (l.kind === 'section') {
            return (
              <div
                key={i}
                className="ln section"
                style={{
                  color: l.text === 'stderr' ? 'var(--terminal-stderr)' : 'var(--terminal-dim)',
                  borderTop: i > 0 ? '1px dashed rgba(255,255,255,0.15)' : undefined,
                  marginTop: i > 0 ? 6 : 0,
                  paddingTop: i > 0 ? 6 : 0,
                  fontSize: 11,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                <span className="num" />
                <span className="txt">── {l.text} ──</span>
              </div>
            );
          }
          const hit = lower && l.text.toLowerCase().includes(lower);
          return (
            <div key={i} className={`ln ${l.kind} ${hit ? 'search-hit' : ''}`}>
              <span className="num">{l.num}</span>
              {/* Non-breaking space keeps blank lines at full height. */}
              <span className="txt">{l.text === '' ? '\u00a0' : l.text}</span>
            </div>
          );
        })}
        {isRunning && !paused && (
          <div className="ln">
            <span className="num" />
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
      {isRunning && !following && (
        <button
          className="btn sm"
          onClick={jumpToLatest}
          title="Scroll to the newest output and resume following"
          style={{
            position: 'absolute',
            bottom: 14,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2,
            boxShadow: '0 2px 10px rgba(0,0,0,0.45)',
          }}
        >
          <Icon.chevron size={12} style={{ transform: 'rotate(90deg)' }} /> Jump to latest
        </button>
      )}
    </div>
  );
}
