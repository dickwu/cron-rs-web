'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/ui/icons';
import { copyText } from '@/lib/clipboard';
import { toast } from '@/components/ui/Toaster';
import { getRunLog, getRunWithOutput } from '@/lib/api';
import { subscribeSSE } from '@/lib/sseBus';
import { LineKind, LogBuffer, formatBytes, isMissingEndpoint, saveRunOutput } from '@/lib/runLog';
import type { JobRunDetail, LogStream, RunLogChunk } from '@/lib/types';

/** Fixed line box (px). Must match `.log-body .ln` in globals.css. */
const LINE_H = 20;
const BODY_PAD = 10;
const VIEW_H = 460;
const OVERSCAN = 30;
const TAIL_BYTES = 64 * 1024;
const EARLIER_BYTES = 256 * 1024;
const MAX_CHUNK = 1024 * 1024;
const FOLLOW_POLL_MS = 2000;
/** "Load everything" is offered for search up to this many unloaded bytes. */
const LOAD_ALL_LIMIT = 32 * 1024 * 1024;
const MAX_MATCHES = 50_000;

// Remember that this backend has no /log endpoint so later views skip the probe.
let logEndpointMissing = false;

type Mode = 'loading' | 'paged' | 'legacy' | 'error';

const STREAMS: Array<{ k: LogStream; label: string }> = [
  { k: 'combined', label: 'All output' },
  { k: 'stdout', label: 'stdout' },
  { k: 'stderr', label: 'stderr' },
];

export function Terminal({ run }: { run: JobRunDetail }) {
  const live = run.status === 'running' || run.status === 'retrying';
  const [stream, setStream] = useState<LogStream>('combined');
  const [mode, setMode] = useState<Mode>(logEndpointMissing ? 'legacy' : 'loading');
  const [error, setError] = useState<string | null>(null);
  const [, setRev] = useState(0);
  const bump = useCallback(() => setRev((r) => r + 1), []);

  const bufRef = useRef<LogBuffer>(LogBuffer.empty('combined'));
  const genRef = useRef(0);
  const appendingRef = useRef(false);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);

  const bodyRef = useRef<HTMLDivElement>(null);
  const followRef = useRef(true);
  const [following, setFollowing] = useState(true);
  const anchorRef = useRef(0);
  const scrollToEndRef = useRef(false);
  const [scrollTop, setScrollTop] = useState(0);
  const rafRef = useRef<number | null>(null);

  const buf = bufRef.current;

  // ---- loading -----------------------------------------------------------

  const loadTail = useCallback(async () => {
    const gen = ++genRef.current;
    setError(null);
    try {
      const chunk = await getRunLog(run.id, { stream, tail: TAIL_BYTES });
      if (gen !== genRef.current) return;
      bufRef.current = LogBuffer.fromChunk(chunk, stream);
      scrollToEndRef.current = true;
      followRef.current = true;
      setFollowing(true);
      setMode('paged');
      bump();
    } catch (err) {
      if (gen !== genRef.current) return;
      if (isMissingEndpoint(err)) {
        logEndpointMissing = true;
        setMode('legacy');
      } else {
        setError(err instanceof Error ? err.message : 'request failed');
        setMode('error');
      }
    }
  }, [run.id, stream, bump]);

  const loadEarlier = useCallback(async () => {
    const b = bufRef.current;
    if (mode !== 'paged' || b.start <= 0 || loadingEarlier) return false;
    const gen = genRef.current;
    setLoadingEarlier(true);
    try {
      const offset = Math.max(0, b.start - EARLIER_BYTES);
      const chunk = await getRunLog(run.id, { stream, offset, limit: b.start - offset });
      if (gen !== genRef.current) return false;
      anchorRef.current += b.prepend(chunk);
      bump();
      return true;
    } catch (err) {
      toast(
        `Couldn't load earlier output: ${err instanceof Error ? err.message : 'request failed'}`,
        'error',
      );
      return false;
    } finally {
      setLoadingEarlier(false);
    }
  }, [mode, loadingEarlier, run.id, stream, bump]);

  const appendNew = useCallback(async () => {
    const b = bufRef.current;
    if (mode !== 'paged' || appendingRef.current) return;
    const gen = genRef.current;
    appendingRef.current = true;
    try {
      // Catch up in bounded chunks if we fell behind.
      for (let i = 0; i < 8; i++) {
        const chunk: RunLogChunk = await getRunLog(run.id, {
          stream,
          offset: b.end,
          limit: MAX_CHUNK,
        });
        if (gen !== genRef.current) return;
        const before = b.length;
        b.append(chunk);
        if (b.length !== before || chunk.data) {
          if (followRef.current) scrollToEndRef.current = true;
          bump();
        }
        if (chunk.complete || chunk.next_offset >= chunk.total_bytes) break;
      }
    } catch {
      // Transient; the next poll retries.
    } finally {
      appendingRef.current = false;
    }
  }, [mode, run.id, stream, bump]);

  const loadAll = useCallback(async () => {
    if (mode !== 'paged') return;
    const gen = genRef.current;
    setLoadingAll(true);
    try {
      while (bufRef.current.start > 0 && gen === genRef.current) {
        const b = bufRef.current;
        const offset = Math.max(0, b.start - MAX_CHUNK);
        const chunk = await getRunLog(run.id, { stream, offset, limit: b.start - offset });
        if (gen !== genRef.current) return;
        const added = b.prepend(chunk);
        if (!added && b.start !== offset) break;
        anchorRef.current += added;
        bump();
      }
    } catch (err) {
      toast(
        `Couldn't load the full log: ${err instanceof Error ? err.message : 'request failed'}`,
        'error',
      );
    } finally {
      setLoadingAll(false);
    }
  }, [mode, run.id, stream, bump]);

  // Initial load and stream switches.
  useEffect(() => {
    if (logEndpointMissing) {
      setMode('legacy');
      return;
    }
    setMode('loading');
    bufRef.current = LogBuffer.empty(stream);
    bump();
    loadTail();
  }, [loadTail, stream, bump]);

  // Follow a live run: poll for new bytes, and fetch immediately when the
  // daemon announces new output over SSE.
  useEffect(() => {
    if (mode !== 'paged') return;
    if (!live) {
      // One last read so the tail written right before exit is shown.
      if (!bufRef.current.complete) appendNew();
      return;
    }
    const t = window.setInterval(appendNew, FOLLOW_POLL_MS);
    const unsub = subscribeSSE(({ event, data }) => {
      if (event !== 'run_output') return;
      const d = data as { run_id?: string; next_offset?: number } | null;
      if (d?.run_id === run.id) appendNew();
    });
    return () => {
      window.clearInterval(t);
      unsub();
    };
  }, [mode, live, appendNew, run.id]);

  // Legacy backends: output comes with the run (old /runs/{id} always
  // included it), or is fetched once if this backend omits it.
  const legacyStdout = run.stdout;
  const legacyStderr = run.stderr;
  useEffect(() => {
    if (mode !== 'legacy') return;
    if (legacyStdout !== undefined || legacyStderr !== undefined) {
      bufRef.current = LogBuffer.fromLegacy(legacyStdout ?? '', legacyStderr ?? '', stream);
      if (followRef.current) scrollToEndRef.current = true;
      bump();
      return;
    }
    const ctrl = new AbortController();
    getRunWithOutput(run.id, ctrl.signal)
      .then((full) => {
        bufRef.current = LogBuffer.fromLegacy(full.stdout || '', full.stderr || '', stream);
        scrollToEndRef.current = true;
        bump();
      })
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'request failed');
        setMode('error');
      });
    return () => ctrl.abort();
    // Refetch when the run finishes so the final output is shown.
  }, [mode, legacyStdout, legacyStderr, stream, run.id, run.status, bump]);

  // ---- scrolling & virtualization -----------------------------------------

  const count = buf.length;
  const bodyH = Math.min(VIEW_H, Math.max(3, count) * LINE_H + BODY_PAD * 2);

  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    if (anchorRef.current) {
      // Keep the same lines under the reader after prepending earlier output.
      el.scrollTop += anchorRef.current * LINE_H;
      anchorRef.current = 0;
      setScrollTop(el.scrollTop);
    }
    if (scrollToEndRef.current) {
      el.scrollTop = el.scrollHeight;
      scrollToEndRef.current = false;
      setScrollTop(el.scrollTop);
    }
  });

  const onScroll = () => {
    const el = bodyRef.current;
    if (!el) return;
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        setScrollTop(el.scrollTop);
      });
    }
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < LINE_H * 2;
    if (nearBottom !== followRef.current) {
      followRef.current = nearBottom;
      setFollowing(nearBottom);
    }
    // Lazy-load earlier output when the reader reaches the top.
    if (el.scrollTop < LINE_H * 4 && el.scrollHeight > el.clientHeight) loadEarlier();
  };

  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  const jumpToLatest = () => {
    followRef.current = true;
    setFollowing(true);
    scrollToEndRef.current = true;
    bump();
  };

  // ---- search over loaded lines ---------------------------------------------

  const [query, setQuery] = useState('');
  const [needle, setNeedle] = useState('');
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const t = window.setTimeout(() => setNeedle(query.trim().toLowerCase()), 200);
    return () => window.clearTimeout(t);
  }, [query]);

  const lengthNow = buf.length;
  const startNow = buf.start;
  const matches = useMemo(() => {
    if (!needle) return [] as number[];
    const out: number[] = [];
    const b = bufRef.current;
    for (let i = 0; i < b.length && out.length < MAX_MATCHES; i++) {
      if (b.kind(i) === LineKind.Section) continue;
      if (b.line(i).toLowerCase().includes(needle)) out.push(i);
    }
    return out;
    // Recompute when the loaded window grows or moves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needle, lengthNow, startNow, mode, stream]);
  const matchSet = useMemo(() => new Set(matches), [matches]);

  const goToMatch = (idx: number) => {
    if (!matches.length) return;
    const i = ((idx % matches.length) + matches.length) % matches.length;
    setCurrent(i);
    const el = bodyRef.current;
    if (el) {
      followRef.current = false;
      setFollowing(false);
      el.scrollTop = Math.max(0, matches[i] * LINE_H - el.clientHeight / 2);
      setScrollTop(el.scrollTop);
    }
  };
  useEffect(() => setCurrent(0), [needle]);

  // ---- actions ---------------------------------------------------------------

  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    const b = bufRef.current;
    const ok = await copyText(b.text());
    if (!ok) {
      toast("Couldn't copy to the clipboard. Use Download instead.", 'error');
      return;
    }
    if (b.start > 0) {
      toast(
        `Copied the loaded ${formatBytes(b.end - b.start)} of ${formatBytes(b.total)}. Download the log for all of it.`,
        'success',
      );
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const [downloading, setDownloading] = useState(false);
  const handleDownload = async () => {
    setDownloading(true);
    try {
      await saveRunOutput(run.id, stream);
    } catch (err) {
      toast(
        `Couldn't download the log: ${err instanceof Error ? err.message : 'request failed'}`,
        'error',
      );
    } finally {
      setDownloading(false);
    }
  };

  // ---- render ---------------------------------------------------------------

  const viewH = bodyRef.current?.clientHeight || bodyH;
  const first = Math.max(0, Math.floor((scrollTop - BODY_PAD) / LINE_H) - OVERSCAN);
  const last = Math.min(count, Math.ceil((scrollTop + viewH) / LINE_H) + OVERSCAN);
  const numbered = buf.fromStart;
  const gutterCh = numbered ? Math.max(3, String(count).length) : 0;
  const currentLine = matches.length ? matches[Math.min(current, matches.length - 1)] : -1;

  const rows: React.ReactNode[] = [];
  for (let i = first; i < last; i++) {
    const kind = buf.kind(i);
    const text = buf.line(i);
    const cls =
      kind === LineKind.Section ? 'sec' : kind === LineKind.Err ? 'err' : 'out';
    rows.push(
      <div
        key={i}
        className={`ln ${cls}${matchSet.has(i) ? ' hit' : ''}${i === currentLine ? ' cur' : ''}`}
      >
        {numbered && <span className="num">{kind === LineKind.Section ? '' : i + 1}</span>}
        <span className="txt">{kind === LineKind.Section ? `${text}` : text || '\u00a0'}</span>
      </div>,
    );
  }

  const loadedBytes = buf.end - buf.start;
  const notLoaded = buf.start;
  const ruler =
    buf.total > 0
      ? { left: (buf.start / buf.total) * 100, width: Math.max(0.5, (loadedBytes / buf.total) * 100) }
      : null;

  let caption: string;
  if (mode === 'loading') caption = 'Loading the end of the log…';
  else if (mode === 'error') caption = '';
  else if (!buf.total && !count) caption = live ? 'Waiting for output…' : 'This run produced no output.';
  else if (mode === 'legacy') caption = `Showing all ${formatBytes(buf.total)}. This server sends output in one piece.`;
  else if (notLoaded > 0)
    caption = `Showing the last ${formatBytes(loadedBytes)} of ${formatBytes(buf.total)}`;
  else caption = `Showing all ${formatBytes(buf.total)}`;

  return (
    <div className="terminal log-viewer">
      <div className="terminal-head log-toolbar">
        <div className="log-streams" role="group" aria-label="Output stream">
          {STREAMS.map((s) => (
            <button
              key={s.k}
              type="button"
              className={`log-stream${stream === s.k ? ' active' : ''}`}
              aria-pressed={stream === s.k}
              onClick={() => setStream(s.k)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="log-search">
          <Icon.search size={11} />
          <input
            type="search"
            aria-label="Search loaded output"
            placeholder="Search output"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                goToMatch(e.shiftKey ? current - 1 : current + 1);
              } else if (e.key === 'Escape') {
                setQuery('');
              }
            }}
          />
          {needle && (
            <span className="log-matches" aria-live="polite">
              {matches.length
                ? `${Math.min(current, matches.length - 1) + 1}/${matches.length.toLocaleString()}${matches.length >= MAX_MATCHES ? '+' : ''}`
                : 'No matches'}
            </span>
          )}
          {needle && matches.length > 0 && (
            <>
              <button
                type="button"
                className="log-icon-btn"
                aria-label="Previous match"
                onClick={() => goToMatch(current - 1)}
              >
                <Icon.chevron size={11} style={{ transform: 'rotate(-90deg)' }} />
              </button>
              <button
                type="button"
                className="log-icon-btn"
                aria-label="Next match"
                onClick={() => goToMatch(current + 1)}
              >
                <Icon.chevron size={11} style={{ transform: 'rotate(90deg)' }} />
              </button>
            </>
          )}
        </div>
        <div className="right">
          {live && (
            <span className="live" title="New output is appended as the run writes it">
              <span className="pulse" /> Live
            </span>
          )}
          <button
            type="button"
            className="log-action"
            onClick={handleCopy}
            disabled={!count}
            title={notLoaded ? 'Copy the loaded part of the log' : 'Copy the output'}
          >
            {copied ? <Icon.check size={11} /> : <Icon.copy size={11} />} {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            type="button"
            className="log-action"
            onClick={handleDownload}
            disabled={downloading || (mode !== 'error' && !buf.total && !count)}
            title="Download the full log as a text file"
          >
            {downloading ? <Icon.spinner size={11} /> : <Icon.download size={11} />} Download
          </button>
        </div>
      </div>

      {mode !== 'error' && (
        <div className="log-ruler">
          <div
            className="log-ruler-track"
            role="img"
            aria-label={caption || 'Log size'}
          >
            {ruler && (
              <div
                className="log-ruler-fill"
                style={{ left: `${ruler.left}%`, width: `${ruler.width}%` }}
              />
            )}
          </div>
          <div className="log-ruler-row">
            <span>{caption}</span>
            {mode === 'paged' && notLoaded > 0 && (
              <button
                type="button"
                className="log-link"
                onClick={() => loadEarlier()}
                disabled={loadingEarlier || loadingAll}
              >
                {loadingEarlier ? 'Loading earlier output…' : `Load earlier output (${formatBytes(notLoaded)} not loaded)`}
              </button>
            )}
          </div>
        </div>
      )}

      {needle && mode === 'paged' && notLoaded > 0 && (
        <div className="log-notice" role="status">
          Search covers the loaded {formatBytes(loadedBytes)} only.{' '}
          {notLoaded <= LOAD_ALL_LIMIT ? (
            <button type="button" className="log-link" onClick={loadAll} disabled={loadingAll}>
              {loadingAll
                ? `Loading… ${formatBytes(buf.start)} left`
                : `Load the full log (${formatBytes(notLoaded)} more) to search all of it`}
            </button>
          ) : (
            <>Download the log to search all {formatBytes(buf.total)}.</>
          )}
        </div>
      )}

      {mode === 'error' ? (
        <div className="log-empty" role="alert">
          <span>
            Couldn&apos;t load this run&apos;s output: {error}. Check that the server is reachable,
            then try again.
          </span>
          <button
            type="button"
            className="log-action"
            onClick={() => {
              setMode('loading');
              loadTail();
            }}
          >
            Try again
          </button>
        </div>
      ) : mode === 'loading' ? (
        <div className="log-empty" aria-busy="true">
          <Icon.spinner size={14} />
        </div>
      ) : count === 0 ? (
        <div className="log-empty">
          {live ? (
            <span>
              Waiting for output <span className="terminal-cursor" />
            </span>
          ) : (
            'This run produced no output.'
          )}
        </div>
      ) : (
        <div
          className="log-body"
          ref={bodyRef}
          onScroll={onScroll}
          style={{ height: bodyH }}
          tabIndex={0}
          aria-label="Run output"
        >
          <div
            className="log-canvas"
            style={{
              height: count * LINE_H + BODY_PAD * 2,
              ['--gutter' as string]: `${gutterCh}ch`,
            }}
          >
            <div style={{ transform: `translateY(${BODY_PAD + first * LINE_H}px)` }}>{rows}</div>
          </div>
        </div>
      )}

      {live && !following && count > 0 && (
        <button type="button" className="log-jump" onClick={jumpToLatest}>
          <Icon.chevronDown size={12} /> Jump to latest output and keep following
        </button>
      )}
    </div>
  );
}
