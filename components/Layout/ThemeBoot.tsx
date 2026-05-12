'use client';

import { useEffect } from 'react';
import { usePrefs, applyPrefsToDocument } from '@/stores/prefsStore';

export function ThemeBoot() {
  const theme = usePrefs((s) => s.theme);
  const density = usePrefs((s) => s.density);
  const accent = usePrefs((s) => s.accent);

  useEffect(() => {
    applyPrefsToDocument({ theme, density, accent });
  }, [theme, density, accent]);

  return null;
}
