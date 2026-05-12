'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark';
export type Density = 'comfortable' | 'compact';
export type Layout = 'sidebar' | 'topbar';

export const ACCENT_COLORS = [
  '#D97706',
  '#0F766E',
  '#2563EB',
  '#7C3AED',
  '#15803D',
  '#E11D48',
] as const;
export type Accent = (typeof ACCENT_COLORS)[number] | string;

interface PrefsState {
  theme: Theme;
  layout: Layout;
  density: Density;
  accent: Accent;
  chartStyle: 'bars' | 'lines' | 'heatmap';
  showSchedule: boolean;
  showCommand: boolean;
  showTags: boolean;
  setTheme: (t: Theme) => void;
  setLayout: (l: Layout) => void;
  setDensity: (d: Density) => void;
  setAccent: (a: Accent) => void;
  setChartStyle: (s: 'bars' | 'lines' | 'heatmap') => void;
  setShowSchedule: (v: boolean) => void;
  setShowCommand: (v: boolean) => void;
  setShowTags: (v: boolean) => void;
  toggleTheme: () => void;
}

export const usePrefs = create<PrefsState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      layout: 'topbar',
      density: 'comfortable',
      accent: '#D97706',
      chartStyle: 'bars',
      showSchedule: true,
      showCommand: true,
      showTags: true,
      setTheme: (theme) => set({ theme }),
      setLayout: (layout) => set({ layout }),
      setDensity: (density) => set({ density }),
      setAccent: (accent) => set({ accent }),
      setChartStyle: (chartStyle) => set({ chartStyle }),
      setShowSchedule: (showSchedule) => set({ showSchedule }),
      setShowCommand: (showCommand) => set({ showCommand }),
      setShowTags: (showTags) => set({ showTags }),
      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
    }),
    { name: 'cron-rs-prefs' },
  ),
);

interface AccentVariant {
  l: string;
  d: string;
  lSoft: string;
  dSoft: string;
  lStrong: string;
  dStrong: string;
  lFg: string;
  dFg: string;
}

const ACCENT_MAP: Record<string, AccentVariant> = {
  '#D97706': {
    l: '#D97706',
    d: '#F59E0B',
    lSoft: 'rgba(217,119,6,0.10)',
    dSoft: 'rgba(245,158,11,0.12)',
    lStrong: '#B45309',
    dStrong: '#FBBF24',
    lFg: '#fff',
    dFg: '#0A0A0B',
  },
  '#0F766E': {
    l: '#0F766E',
    d: '#2DD4BF',
    lSoft: 'rgba(15,118,110,0.10)',
    dSoft: 'rgba(45,212,191,0.12)',
    lStrong: '#0E6963',
    dStrong: '#5EEAD4',
    lFg: '#fff',
    dFg: '#0A0A0B',
  },
  '#2563EB': {
    l: '#2563EB',
    d: '#60A5FA',
    lSoft: 'rgba(37,99,235,0.10)',
    dSoft: 'rgba(96,165,250,0.12)',
    lStrong: '#1D4ED8',
    dStrong: '#93C5FD',
    lFg: '#fff',
    dFg: '#0A0A0B',
  },
  '#7C3AED': {
    l: '#7C3AED',
    d: '#A78BFA',
    lSoft: 'rgba(124,58,237,0.10)',
    dSoft: 'rgba(167,139,250,0.12)',
    lStrong: '#6D28D9',
    dStrong: '#C4B5FD',
    lFg: '#fff',
    dFg: '#0A0A0B',
  },
  '#15803D': {
    l: '#15803D',
    d: '#4ADE80',
    lSoft: 'rgba(21,128,61,0.10)',
    dSoft: 'rgba(74,222,128,0.12)',
    lStrong: '#166534',
    dStrong: '#86EFAC',
    lFg: '#fff',
    dFg: '#0A0A0B',
  },
  '#E11D48': {
    l: '#E11D48',
    d: '#FB7185',
    lSoft: 'rgba(225,29,72,0.10)',
    dSoft: 'rgba(251,113,133,0.12)',
    lStrong: '#BE123C',
    dStrong: '#FDA4AF',
    lFg: '#fff',
    dFg: '#0A0A0B',
  },
};

export function applyPrefsToDocument(p: Pick<PrefsState, 'theme' | 'density' | 'accent'>) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', p.theme);
  root.setAttribute('data-density', p.density);
  const a = ACCENT_MAP[p.accent] || ACCENT_MAP['#D97706'];
  if (p.theme === 'light') {
    root.style.setProperty('--accent', a.l);
    root.style.setProperty('--accent-soft', a.lSoft);
    root.style.setProperty('--accent-strong', a.lStrong);
    root.style.setProperty('--accent-fg', a.lFg);
  } else {
    root.style.setProperty('--accent', a.d);
    root.style.setProperty('--accent-soft', a.dSoft);
    root.style.setProperty('--accent-strong', a.dStrong);
    root.style.setProperty('--accent-fg', a.dFg);
  }
}
