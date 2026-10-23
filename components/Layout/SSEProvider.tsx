'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSWRConfig } from 'swr';
import { getToken, clearToken, getApiUrl } from '@/lib/auth';
import { toast } from '@/components/ui/Toaster';
import { CONNECTION_CHANGED_EVENT, publishSSE } from '@/lib/sseBus';
import type { TaskSummary } from '@/lib/types';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

const SSEContext = createContext<ConnectionStatus>('disconnected');

/** Live connection state of the app-wide event stream. */
export function useSSEStatus(): ConnectionStatus {
  return useContext(SSEContext);
}

type CacheGroup = 'tasks' | 'runs' | 'status' | 'dashboard' | 'hooks';

/** Minimum gap between cache revalidations triggered by events. */
const FLUSH_INTERVAL_MS = 1000;

function keyPath(key: unknown): string | null {
  if (typeof key !== 'string') return null;
  // useSWRInfinite stores pages under `$inf$<first key>`.
  return key.startsWith('$inf$') ? key.slice(5) : key;
}

function matchesGroup(path: string, group: CacheGroup): boolean {
  switch (group) {
    case 'tasks':
      return path.startsWith('/api/v1/tasks');
    case 'runs':
      // Run lists and run metadata. Log chunks are append-only and fetched
      // incrementally by the log viewer, so never blanket-revalidate them.
      return (
        (path.startsWith('/api/v1/runs') && !path.includes('/log')) ||
        (path.startsWith('/api/v1/tasks/') && path.includes('/detail'))
      );
    case 'status':
      return path === '/api/v1/status';
    case 'dashboard':
      return path.startsWith('/api/v1/dashboard');
    case 'hooks':
      return path.includes('/hooks');
  }
}

function groupsFor(event: string): CacheGroup[] {
  switch (event) {
    case 'task_created':
    case 'task_updated':
    case 'task_deleted':
    case 'task_enabled':
    case 'task_disabled':
      return ['tasks', 'status', 'dashboard'];
    case 'run_started':
    case 'run_completed':
    case 'run_failed':
    case 'run_updated':
      return ['runs', 'status', 'dashboard'];
    case 'hook_fired':
      return ['hooks'];
    default:
      // heartbeat, run_output (handled by subscribers), unknown events.
      return [];
  }
}

/**
 * One SSE connection for the whole app, mounted in the root layout so it
 * survives client-side navigation (it used to live in each page's AppShell
 * and reconnected on every route change).
 *
 * Events are fanned out to `subscribeSSE` listeners and translated into
 * SWR revalidations. Revalidations are batched: bursts of events (e.g. many
 * tasks finishing at :00) mark cache groups dirty and are flushed at most
 * once per second, instead of refetching every list per event.
 */
export function SSEProvider({ children }: { children: React.ReactNode }) {
  const { mutate, cache } = useSWRConfig();
  const pathname = usePathname();
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const statusRef = useRef<ConnectionStatus>('disconnected');
  const retryCountRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef<Set<CacheGroup>>(new Set());
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFlushRef = useRef(0);

  const updateStatus = useCallback((s: ConnectionStatus) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  const flush = useCallback(() => {
    flushTimerRef.current = null;
    lastFlushRef.current = Date.now();
    const groups = [...dirtyRef.current];
    dirtyRef.current.clear();
    if (!groups.length) return;
    mutate(
      (key) => {
        const path = keyPath(key);
        return path !== null && groups.some((g) => matchesGroup(path, g));
      },
      undefined,
      { revalidate: true },
    );
  }, [mutate]);

  const markDirty = useCallback(
    (groups: CacheGroup[]) => {
      if (!groups.length) return;
      groups.forEach((g) => dirtyRef.current.add(g));
      if (flushTimerRef.current) return;
      const wait = Math.max(0, FLUSH_INTERVAL_MS - (Date.now() - lastFlushRef.current));
      flushTimerRef.current = setTimeout(flush, wait);
    },
    [flush],
  );

  const taskName = useCallback(
    (taskId: unknown): string => {
      if (typeof taskId !== 'string') return 'unknown task';
      // Use the cached task list instead of fetching the task per event.
      const tasks = cache.get('/api/v1/tasks')?.data as TaskSummary[] | undefined;
      return tasks?.find((t) => t.id === taskId)?.name ?? taskId;
    },
    [cache],
  );

  const dispatch = useCallback(
    (event: string, rawData: string) => {
      let data: unknown = null;
      if (rawData) {
        try {
          data = JSON.parse(rawData);
        } catch {
          data = rawData;
        }
      }
      publishSSE({ event, data });
      markDirty(groupsFor(event));
      if (event === 'run_failed') {
        const run = (data as { run?: { task_id?: string } } | null)?.run;
        toast(`Run failed for task: ${taskName(run?.task_id)}`, 'error');
      }
    },
    [markDirty, taskName],
  );

  const connect = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    if (controllerRef.current && !controllerRef.current.signal.aborted) return;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    updateStatus('connecting');

    try {
      const res = await fetch(`${getApiUrl()}/api/v1/events`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
        signal: controller.signal,
      });

      if (res.status === 401) {
        clearToken();
        controller.abort();
        window.location.href = '/login';
        return;
      }
      if (!res.ok || !res.body) throw new Error(`SSE connection failed: ${res.status}`);

      updateStatus('connected');
      retryCountRef.current = 0;
      // Anything may have changed while we were disconnected.
      markDirty(['tasks', 'runs', 'status', 'dashboard']);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      // Parser state must survive across network chunks: an event's
      // `event:` and `data:` lines can arrive in different reads.
      let eventName = '';
      let dataLines: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r\n|\n|\r/);
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line === '') {
            if (dataLines.length || eventName) {
              dispatch(eventName || 'message', dataLines.join('\n'));
            }
            eventName = '';
            dataLines = [];
            continue;
          }
          if (line.startsWith(':')) continue; // comment / keep-alive
          const colon = line.indexOf(':');
          const field = colon === -1 ? line : line.slice(0, colon);
          let val = colon === -1 ? '' : line.slice(colon + 1);
          if (val.startsWith(' ')) val = val.slice(1);
          if (field === 'event') eventName = val.trim();
          else if (field === 'data') dataLines.push(val);
        }
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('SSE connection error:', err);
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
      if (!controller.signal.aborted) {
        updateStatus('disconnected');
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
        retryCountRef.current += 1;
        reconnectTimerRef.current = setTimeout(connect, delay);
      }
    }
  }, [dispatch, markDirty, updateStatus]);

  const disconnect = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = null;
    updateStatus('disconnected');
  }, [updateStatus]);

  // (Re)connect whenever we land on a page with a token (e.g. right after
  // login); drop the connection on the login page / after sign-out. Because
  // `connect` is a no-op while a connection is live, navigating between pages
  // keeps the existing stream.
  useEffect(() => {
    if (getToken()) connect();
    else disconnect();
  }, [pathname, connect, disconnect]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (statusRef.current === 'disconnected') {
          retryCountRef.current = 0;
          connect();
        }
      } else {
        // Don't hold a connection (and trigger refetches) for hidden tabs.
        disconnect();
      }
    };
    const handleConnectionChanged = () => {
      disconnect();
      retryCountRef.current = 0;
      connect();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener(CONNECTION_CHANGED_EVENT, handleConnectionChanged);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener(CONNECTION_CHANGED_EVENT, handleConnectionChanged);
      controllerRef.current?.abort();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    };
  }, [connect, disconnect]);

  return <SSEContext.Provider value={status}>{children}</SSEContext.Provider>;
}
