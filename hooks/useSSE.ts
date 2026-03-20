'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSWRConfig } from 'swr';
import { getToken, clearToken, getApiUrl } from '@/lib/auth';
import { message } from 'antd';
import type { SSEEventType } from '@/lib/types';

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

export function useSSE() {
  const { mutate } = useSWRConfig();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const retryCountRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const invalidateCaches = useCallback(
    (eventType: SSEEventType) => {
      switch (eventType) {
        case 'task_created':
        case 'task_updated':
        case 'task_deleted':
        case 'task_enabled':
        case 'task_disabled':
          mutate((key: string) => typeof key === 'string' && key.startsWith('/api/v1/tasks'), undefined, { revalidate: true });
          mutate('/api/v1/status', undefined, { revalidate: true });
          break;
        case 'run_started':
        case 'run_completed':
        case 'run_failed':
          mutate((key: string) => typeof key === 'string' && key.startsWith('/api/v1/runs'), undefined, { revalidate: true });
          mutate('/api/v1/status', undefined, { revalidate: true });
          break;
        case 'hook_fired':
          mutate((key: string) => typeof key === 'string' && key.includes('/hooks'), undefined, { revalidate: true });
          break;
        case 'heartbeat':
          break;
      }
    },
    [mutate]
  );

  const connect = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    const apiUrl = getApiUrl();
    const controller = new AbortController();
    controllerRef.current = controller;
    setConnectionStatus('connecting');

    try {
      const res = await fetch(`${apiUrl}/api/v1/events`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });

      if (res.status === 401) {
        clearToken();
        window.location.href = '/login';
        return;
      }

      if (!res.ok || !res.body) {
        throw new Error(`SSE connection failed: ${res.status}`);
      }

      setConnectionStatus('connected');
      retryCountRef.current = 0;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ') && currentEvent) {
            const eventType = currentEvent as SSEEventType;
            invalidateCaches(eventType);

            if (eventType === 'run_failed') {
              try {
                const data = JSON.parse(line.slice(6));
                message.warning(`Run failed for task: ${data.run?.task_id || 'unknown'}`);
              } catch {
                message.warning('A task run has failed');
              }
            }

            currentEvent = '';
          } else if (line === '') {
            currentEvent = '';
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('SSE connection error:', err);
    } finally {
      if (!controller.signal.aborted) {
        setConnectionStatus('disconnected');
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
        retryCountRef.current += 1;
        reconnectTimerRef.current = setTimeout(connect, delay);
      }
    }
  }, [invalidateCaches]);

  useEffect(() => {
    connect();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (controllerRef.current?.signal.aborted || connectionStatus === 'disconnected') {
          connect();
        }
      } else {
        controllerRef.current?.abort();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      controllerRef.current?.abort();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, [connect, connectionStatus]);

  return { connectionStatus };
}
