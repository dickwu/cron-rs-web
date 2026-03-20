export interface Task {
  id: string;
  name: string;
  command: string;
  schedule: string;
  description: string;
  enabled: boolean;
  max_retries: number;
  retry_delay_secs: number;
  timeout_secs: number | null;
  concurrency_policy: 'skip' | 'allow' | 'queue';
  created_at: string;
  updated_at: string;
}

export interface Hook {
  id: string;
  task_id: string;
  hook_type: 'on_failure' | 'on_success' | 'on_retry_exhausted';
  command: string;
  timeout_secs: number;
  run_order: number;
  created_at: string;
}

export interface JobRun {
  id: string;
  task_id: string;
  started_at: string;
  finished_at: string | null;
  exit_code: number | null;
  stdout: string;
  stderr: string;
  status: 'running' | 'success' | 'failed' | 'retrying' | 'timeout' | 'skipped' | 'crashed';
  attempt: number;
  duration_ms: number | null;
}

export interface HookRun {
  id: string;
  job_run_id: string;
  hook_id: string;
  exit_code: number | null;
  stdout: string;
  stderr: string;
  started_at: string;
  finished_at: string | null;
  status: 'success' | 'failed' | 'timeout';
}

export interface StatusResponse {
  task_count: number;
  active_timers: number;
  runs_24h: number;
  success_rate: number;
  recent_failures_24h: number;
}

export type SSEEventType =
  | 'task_created'
  | 'task_updated'
  | 'task_deleted'
  | 'task_enabled'
  | 'task_disabled'
  | 'run_started'
  | 'run_completed'
  | 'run_failed'
  | 'hook_fired'
  | 'heartbeat';

export interface SSEEvent {
  event: SSEEventType;
  data: unknown;
}

export interface CreateTaskPayload {
  name: string;
  command: string;
  schedule: string;
  description?: string;
  max_retries?: number;
  retry_delay_secs?: number;
  timeout_secs?: number | null;
  concurrency_policy?: 'skip' | 'allow' | 'queue';
}

export interface UpdateTaskPayload extends Partial<CreateTaskPayload> {
  enabled?: boolean;
}

export interface CreateHookPayload {
  task_id: string;
  hook_type: 'on_failure' | 'on_success' | 'on_retry_exhausted';
  command: string;
  timeout_secs?: number;
  run_order?: number;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}
