export interface Task {
  id: string;
  name: string;
  command: string;
  schedule: string;
  tags: string[];
  description: string;
  enabled: boolean;
  max_retries: number;
  retry_delay_secs: number;
  timeout_secs: number | null;
  concurrency_policy: 'skip' | 'allow' | 'queue';
  lock_key: string | null;
  sandbox_profile: string | null;
  created_at: string;
  updated_at: string;
}

export type TaskSummary = Pick<
  Task,
  'id' | 'name' | 'schedule' | 'tags' | 'enabled' | 'updated_at'
>;

export interface Hook {
  id: string;
  task_id: string | null;
  hook_type: 'on_failure' | 'on_success' | 'on_retry_exhausted';
  command: string;
  timeout_secs: number | null;
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

export type JobRunStatus = JobRun['status'];

export interface JobRunSummary {
  id: string;
  task_id: string;
  started_at: string;
  finished_at: string | null;
  exit_code: number | null;
  status: JobRunStatus;
  attempt: number;
  duration_ms: number | null;
}

export interface DashboardRunSummary extends JobRunSummary {
  task_name: string | null;
}

export interface DashboardSummary {
  task_count: number;
  active_timers: number;
  runs_24h: number;
  success_rate: number;
  recent_failures_24h: number;
}

export type DashboardRange = '24h' | '7d' | '30d';

export interface DashboardRunCounts {
  success: number;
  failed: number;
  skipped: number;
  running: number;
}

export interface DashboardBucket {
  label: string;
  bucket_start: string;
  counts: DashboardRunCounts;
}

export interface DashboardTaskBreakdown {
  task_id: string;
  task_name: string | null;
  total: number;
  counts: DashboardRunCounts;
}

export interface DashboardActivity {
  range: DashboardRange;
  buckets: DashboardBucket[];
  total: number;
  success: number;
  failed: number;
  skipped: number;
  running: number;
  success_rate: number | null;
  top_tasks: DashboardTaskBreakdown[];
  failed_runs: DashboardRunSummary[];
}

export interface TaskDetailResponse {
  task: Task;
  hooks: Hook[];
  runs: JobRunSummary[];
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

export type StatusResponse = DashboardSummary;

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
  tags?: string[];
  description?: string;
  max_retries?: number;
  retry_delay_secs?: number;
  timeout_secs?: number | null;
  concurrency_policy?: 'skip' | 'allow' | 'queue';
  lock_key?: string | null;
  sandbox_profile?: string | null;
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

export interface CreateGlobalHookPayload {
  hook_type: 'on_failure' | 'on_success' | 'on_retry_exhausted';
  command: string;
  timeout_secs?: number;
  run_order?: number;
}

export interface UpdateHookPayload {
  hook_type?: 'on_failure' | 'on_success' | 'on_retry_exhausted';
  command?: string;
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

export interface AppSettings {
  retention_days: number;
}

export interface UpdateSettingsPayload {
  retention_days: number;
}
