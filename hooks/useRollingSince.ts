'use client';

import { useEffect, useState } from 'react';

function compute(windowMs: number, stepMs: number): string {
  // Round down to the refresh step so the ISO string (and thus the SWR key)
  // only changes once per step instead of on every render.
  const now = Math.floor(Date.now() / stepMs) * stepMs;
  return new Date(now - windowMs).toISOString();
}

/**
 * A `since` cutoff (ISO 8601) for a rolling window ending "now", advanced every
 * `stepMs`. Use this instead of memoizing `Date.now()` once at mount, which
 * freezes the window for long-lived pages.
 */
export function useRollingSince(windowMs: number, stepMs = 60_000): string {
  const [since, setSince] = useState(() => compute(windowMs, stepMs));
  useEffect(() => {
    setSince(compute(windowMs, stepMs));
    const id = setInterval(() => setSince(compute(windowMs, stepMs)), stepMs);
    return () => clearInterval(id);
  }, [windowMs, stepMs]);
  return since;
}
