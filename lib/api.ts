import { getToken, clearToken, getApiUrl } from './auth';
import type {
  Task,
  Hook,
  JobRun,
  HookRun,
  StatusResponse,
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

class ApiError extends Error {
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
    throw new ApiError(body || res.statusText, res.status);
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

// Status
export async function getStatus(): Promise<StatusResponse> {
  return fetchApi<StatusResponse>('/api/v1/status');
}

// Tasks
export async function getTasks(): Promise<Task[]> {
  return fetchApi<Task[]>('/api/v1/tasks');
}

export async function getTask(id: string): Promise<Task> {
  return fetchApi<Task>(`/api/v1/tasks/${id}`);
}

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
export async function getRuns(params?: {
  task_id?: string;
  status?: string;
  limit?: number;
  offset?: number;
  since?: string;
}): Promise<JobRun[]> {
  const searchParams = new URLSearchParams();
  if (params?.task_id) searchParams.set('task_id', params.task_id);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));
  if (params?.since) searchParams.set('since', params.since);
  const qs = searchParams.toString();
  return fetchApi<JobRun[]>(`/api/v1/runs${qs ? `?${qs}` : ''}`);
}

export async function getRun(id: string): Promise<JobRun> {
  return fetchApi<JobRun>(`/api/v1/runs/${id}`);
}

// Hooks
export async function getHooks(taskId: string): Promise<Hook[]> {
  return fetchApi<Hook[]>(`/api/v1/tasks/${taskId}/hooks`);
}

export async function getAllHooks(): Promise<Hook[]> {
  return fetchApi<Hook[]>('/api/v1/hooks');
}

export async function getGlobalHooks(): Promise<Hook[]> {
  return fetchApi<Hook[]>('/api/v1/hooks/global');
}

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

// Hook Runs
export async function getHookRuns(runId: string): Promise<HookRun[]> {
  return fetchApi<HookRun[]>(`/api/v1/runs/${runId}/hooks`);
}

// Schedule preview
export async function getSchedulePreview(
  expr: string,
  count: number = 5
): Promise<string[]> {
  return fetchApi<string[]>(
    `/api/v1/schedule/preview?expr=${encodeURIComponent(expr)}&count=${count}`
  );
}

// Settings
export async function getSettings(): Promise<AppSettings> {
  return fetchApi<AppSettings>('/api/v1/settings');
}

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
