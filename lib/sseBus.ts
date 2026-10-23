/**
 * Tiny in-process pub/sub for server-sent events, so components (e.g. the
 * log viewer following a running run) can react to specific events without
 * opening their own connection to /api/v1/events.
 */
import type { SSEEventType } from './types';

export interface SSEMessage {
  event: SSEEventType | string;
  data: unknown;
}

type Listener = (msg: SSEMessage) => void;

const listeners = new Set<Listener>();

export function subscribeSSE(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function publishSSE(msg: SSEMessage): void {
  for (const l of listeners) {
    try {
      l(msg);
    } catch (err) {
      console.error('SSE listener failed:', err);
    }
  }
}

/** Fired by Settings/login when the API URL or token changes. */
export const CONNECTION_CHANGED_EVENT = 'cron-rs:connection-changed';

export function notifyConnectionChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CONNECTION_CHANGED_EVENT));
}
