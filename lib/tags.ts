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

