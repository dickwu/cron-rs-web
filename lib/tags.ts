import type { TaskSummary } from './types';

export function normalizeTags(tags?: string[] | null): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const tag of tags || []) {
    const trimmed = tag.trim();
    if (!trimmed) continue;

    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      normalized.push(trimmed);
    }
  }

  return normalized;
}

export function collectTaskTags(tasks: TaskSummary[]): string[] {
  return normalizeTags(tasks.flatMap((task) => task.tags || [])).sort((a, b) =>
    a.localeCompare(b)
  );
}

export function taskMatchesTags(task: TaskSummary, selectedTags: string[]): boolean {
  if (selectedTags.length === 0) return true;

  const taskTags = new Set((task.tags || []).map((tag) => tag.toLowerCase()));
  return selectedTags.every((tag) => taskTags.has(tag.toLowerCase()));
}
