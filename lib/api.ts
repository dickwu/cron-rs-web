import { getToken, clearToken, getApiUrl } from './auth';
import type {
  Task,
  Hook,
  JobRun,
  JobRunDetail,
  JobRunSummary,
  RunsPageResponse,
  RunLogChunk,
  LogStream,
  CreateTaskPayload,
  UpdateTaskPayload,
  CreateHookPayload,
  CreateGlobalHookPayload,
  UpdateHookPayload,
  LoginPayload,
  LoginResponse,
  AppSettings,
  UpdateSettingsPayload,
} from './types';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const apiUrl = getApiUrl();
  const token = getToken();

  const res = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    clearToken();
    if (typeof window !== 'undefined' && path !== '/api/v1/auth/login') {
      window.location.href = '/login';
    }
    throw new ApiError('Unauthorized', 401);
  }

  if (!res.ok) {
    const body = await res.text();
    let message = body || res.statusText;
    try {
      const parsed = JSON.parse(body);
      if (typeof parsed?.error === 'string' && parsed.error) {
        message = parsed.error;
      }
    } catch {
      // Not JSON — keep the raw text.
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

// Auth
export async function login(payload: LoginPayload): Promise<LoginResponse> {
  return fetchApi<LoginResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// Tasks
export async function createTask(payload: CreateTaskPayload): Promise<Task> {
  return fetchApi<Task>('/api/v1/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateTask(id: string, payload: UpdateTaskPayload): Promise<Task> {
  return fetchApi<Task>(`/api/v1/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteTask(id: string): Promise<void> {
  return fetchApi<void>(`/api/v1/tasks/${id}`, { method: 'DELETE' });
}

export async function triggerTask(id: string): Promise<void> {
  return fetchApi<void>(`/api/v1/tasks/${id}/trigger`, { method: 'POST' });
}

export async function enableTask(id: string): Promise<void> {
  return fetchApi<void>(`/api/v1/tasks/${id}/enable`, { method: 'POST' });
}

export async function disableTask(id: string): Promise<void> {
  return fetchApi<void>(`/api/v1/tasks/${id}/disable`, { method: 'POST' });
}

// Runs

export interface RunsQuery {
  task_id?: string;
  status?: string;
  since?: string;
  limit?: number;
}

/** Normalised page of run summaries, whichever backend generation answered. */
export interface RunsPage {
  runs: JobRunSummary[];
  /** Keyset cursor for the next (older) page; null when exhausted or legacy. */
  nextCursor: string | null;
  /** Whether older rows may exist beyond this page. */
  hasMore: boolean;
  /** Older backends return a bare array and only support offset paging. */
  legacy: boolean;
}

/** Newer backends cap `limit` at 500. */
export const RUNS_PAGE_MAX = 500;

/**
 * Path for a run-summary list request. Never asks for output: summaries are
 * what every list view needs, and newer backends don't support output here.
 */
export function runsListPath(
  query: RunsQuery,
  page?: { before?: string | null; offset?: number },
): string {
  const sp = new URLSearchParams();
  sp.set('limit', String(Math.min(query.limit ?? 50, RUNS_PAGE_MAX)));
  if (query.task_id) sp.set('task_id', query.task_id);
  if (query.status) sp.set('status', query.status);
  if (query.since) sp.set('since', query.since);
  if (page?.before) sp.set('before', page.before);
  if (page?.offset) sp.set('offset', String(page.offset));
  return `/api/v1/runs?${sp.toString()}`;
}

function requestedLimit(path: string): number {
  const q = path.indexOf('?');
  const limit = Number(new URLSearchParams(q === -1 ? '' : path.slice(q + 1)).get('limit'));
  return Number.isFinite(limit) && limit > 0 ? limit : 50;
}

/** Fetch a run list and normalise `{runs, next_cursor}` vs. a legacy array. */
export async function fetchRunsPage(path: string): Promise<RunsPage> {
  const body = await fetchApi<RunsPageResponse | JobRunSummary[]>(path);
  if (Array.isArray(body)) {
    return {
      runs: body,
      nextCursor: null,
      hasMore: body.length >= requestedLimit(path),
      legacy: true,
    };
  }
  const runs = Array.isArray(body?.runs) ? body.runs : [];
  return {
    runs,
    nextCursor: body?.next_cursor ?? null,
    hasMore: !!body?.next_cursor,
    legacy: false,
  };
}

/** Run metadata (newer backends return no stdout/stderr here). */
export async function getRun(id: string): Promise<JobRunDetail> {
  return fetchApi<JobRunDetail>(`/api/v1/runs/${encodeURIComponent(id)}`);
}

/**
 * Legacy fallback for backends without the log endpoint: the full captured
 * output, fetched once on demand (never polled).
 */
export async function getRunWithOutput(id: string, signal?: AbortSignal): Promise<JobRun> {
  return fetchApi<JobRun>(`/api/v1/runs/${encodeURIComponent(id)}?include_output=true`, {
    signal,
  });
}

export interface RunLogRequest {
  stream: LogStream;
  /** Byte offset to read from. */
  offset?: number;
  /** Max bytes to return (server default 64 KiB, max 1 MiB). */
  limit?: number;
  /** Read the last N bytes instead of from an offset. */
  tail?: number;
}

function runLogPath(id: string, req: RunLogRequest): string {
  const sp = new URLSearchParams();
  sp.set('stream', req.stream);
  if (req.tail != null) sp.set('tail', String(req.tail));
  else if (req.offset != null) sp.set('offset', String(req.offset));
  if (req.limit != null) sp.set('limit', String(req.limit));
  return `/api/v1/runs/${encodeURIComponent(id)}/log?${sp.toString()}`;
}

/** One byte-range chunk of a run's output. 404 means the backend predates it. */
export async function getRunLog(
  id: string,
  req: RunLogRequest,
  signal?: AbortSignal,
): Promise<RunLogChunk> {
  return fetchApi<RunLogChunk>(runLogPath(id, req), { signal });
}

/**
 * Download a run's full output via the streaming download endpoint. Uses the
 * File System Access API when available so the log streams straight to disk;
 * otherwise buffers it into a Blob. Returns false if the endpoint is missing
 * (older backend) so the caller can fall back.
 */
export async function downloadRunLog(
  id: string,
  stream: LogStream,
  filename: string,
): Promise<boolean> {
  const token = getToken();
  const res = await fetch(
    `${getApiUrl()}/api/v1/runs/${encodeURIComponent(id)}/log/download?stream=${stream}`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  );
  if (res.status === 404 || res.status === 405) return false;
  if (res.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new ApiError('Unauthorized', 401);
  }
  if (!res.ok || !res.body) throw new ApiError(`Download failed: ${res.status}`, res.status);

  type SavePicker = (opts: {
    suggestedName?: string;
    types?: Array<{ description: string; accept: Record<string, string[]> }>;
  }) => Promise<{ createWritable: () => Promise<WritableStream<Uint8Array>> }>;
  const picker = (window as unknown as { showSaveFilePicker?: SavePicker }).showSaveFilePicker;
  if (picker) {
    let handle;
    try {
      handle = await picker({
        suggestedName: filename,
        types: [{ description: 'Log file', accept: { 'text/plain': ['.log', '.txt'] } }],
      });
    } catch (err) {
      await res.body.cancel();
      if (err instanceof DOMException && err.name === 'AbortError') return true; // user cancelled
      throw err;
    }
    await res.body.pipeTo(await handle.createWritable());
    return true;
  }

  const blob = await res.blob();
  saveBlob(blob, filename);
  return true;
}

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Hooks
export async function createHook(payload: CreateHookPayload): Promise<Hook> {
  return fetchApi<Hook>(`/api/v1/tasks/${payload.task_id}/hooks`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createGlobalHook(payload: CreateGlobalHookPayload): Promise<Hook> {
  return fetchApi<Hook>('/api/v1/hooks/global', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateHook(hookId: string, payload: UpdateHookPayload): Promise<Hook> {
  return fetchApi<Hook>(`/api/v1/hooks/${hookId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteHook(hookId: string): Promise<void> {
  return fetchApi<void>(`/api/v1/hooks/${hookId}`, {
    method: 'DELETE',
  });
}

// Schedule preview
export function schedulePreviewPath(schedule: string, count: number = 5): string {
  return `/api/v1/schedule/preview?schedule=${encodeURIComponent(schedule)}&count=${count}`;
}

// Settings
export async function updateSettings(payload: UpdateSettingsPayload): Promise<AppSettings> {
  return fetchApi<AppSettings>('/api/v1/settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

// Fetcher for SWR
export function swrFetcher<T>(path: string): Promise<T> {
  return fetchApi<T>(path);
}
