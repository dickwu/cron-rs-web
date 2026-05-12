import React from 'react';

interface IconProps {
  size?: number;
  stroke?: number;
  fill?: string;
  style?: React.CSSProperties;
  className?: string;
}

interface BaseIconProps extends IconProps {
  d: React.ReactNode;
}

function Svg({ d, size = 16, stroke = 1.5, fill, style, className }: BaseIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill || 'none'}
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {d}
    </svg>
  );
}

export const Icon = {
  dashboard: (p: IconProps) => (
    <Svg
      {...p}
      d={
        <>
          <rect x="3" y="3" width="7" height="9" rx="1.5" />
          <rect x="14" y="3" width="7" height="5" rx="1.5" />
          <rect x="14" y="12" width="7" height="9" rx="1.5" />
          <rect x="3" y="16" width="7" height="5" rx="1.5" />
        </>
      }
    />
  ),
  tasks: (p: IconProps) => (
    <Svg
      {...p}
      d={
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </>
      }
    />
  ),
  runs: (p: IconProps) => <Svg {...p} d={<path d="M3 12h4l3-8 4 16 3-8h4" />} />,
  hooks: (p: IconProps) => (
    <Svg
      {...p}
      d={
        <>
          <path d="M14 4v6a4 4 0 1 1-8 0V8" />
          <circle cx="14" cy="4" r="2" />
        </>
      }
    />
  ),
  settings: (p: IconProps) => (
    <Svg
      {...p}
      d={
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </>
      }
    />
  ),
  search: (p: IconProps) => (
    <Svg
      {...p}
      d={
        <>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </>
      }
    />
  ),
  plus: (p: IconProps) => <Svg {...p} d={<path d="M12 5v14M5 12h14" />} />,
  play: (p: IconProps) => (
    <Svg {...p} d={<polygon points="6 4 20 12 6 20 6 4" fill="currentColor" />} />
  ),
  pause: (p: IconProps) => (
    <Svg
      {...p}
      d={
        <>
          <rect x="6" y="5" width="4" height="14" fill="currentColor" />
          <rect x="14" y="5" width="4" height="14" fill="currentColor" />
        </>
      }
    />
  ),
  edit: (p: IconProps) => (
    <Svg
      {...p}
      d={
        <>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
        </>
      }
    />
  ),
  trash: (p: IconProps) => (
    <Svg
      {...p}
      d={
        <>
          <path d="M3 6h18" />
          <path d="M19 6l-1.5 14a2 2 0 0 1-2 1.8H8.5a2 2 0 0 1-2-1.8L5 6" />
          <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
        </>
      }
    />
  ),
  check: (p: IconProps) => <Svg {...p} d={<path d="M5 12l5 5L20 7" />} />,
  x: (p: IconProps) => <Svg {...p} d={<path d="M18 6L6 18M6 6l12 12" />} />,
  copy: (p: IconProps) => (
    <Svg
      {...p}
      d={
        <>
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </>
      }
    />
  ),
  refresh: (p: IconProps) => (
    <Svg
      {...p}
      d={
        <>
          <path d="M3 12a9 9 0 0 1 14.7-7L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-14.7 7L3 16" />
          <path d="M3 21v-5h5" />
        </>
      }
    />
  ),
  chevron: (p: IconProps) => <Svg {...p} d={<path d="M9 18l6-6-6-6" />} />,
  chevronDown: (p: IconProps) => <Svg {...p} d={<path d="M6 9l6 6 6-6" />} />,
  download: (p: IconProps) => (
    <Svg
      {...p}
      d={
        <>
          <path d="M12 3v14" />
          <path d="M5 12l7 7 7-7" />
          <path d="M5 21h14" />
        </>
      }
    />
  ),
  more: (p: IconProps) => (
    <Svg
      {...p}
      d={
        <>
          <circle cx="5" cy="12" r="1.5" fill="currentColor" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
          <circle cx="19" cy="12" r="1.5" fill="currentColor" />
        </>
      }
    />
  ),
  sun: (p: IconProps) => (
    <Svg
      {...p}
      d={
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </>
      }
    />
  ),
  moon: (p: IconProps) => (
    <Svg {...p} d={<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />} />
  ),
  terminal: (p: IconProps) => (
    <Svg
      {...p}
      d={
        <>
          <polyline points="4 17 10 11 4 5" />
          <line x1="12" y1="19" x2="20" y2="19" />
        </>
      }
    />
  ),
  alert: (p: IconProps) => (
    <Svg
      {...p}
      d={
        <>
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </>
      }
    />
  ),
  info: (p: IconProps) => (
    <Svg
      {...p}
      d={
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </>
      }
    />
  ),
  user: (p: IconProps) => (
    <Svg
      {...p}
      d={
        <>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </>
      }
    />
  ),
  notes: (p: IconProps) => (
    <Svg
      {...p}
      d={
        <>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="17" x2="15" y2="17" />
        </>
      }
    />
  ),
  calendar: (p: IconProps) => (
    <Svg
      {...p}
      d={
        <>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </>
      }
    />
  ),
  spinner: (p: IconProps) => (
    <Svg
      {...p}
      className={`spinner ${p.className || ''}`}
      d={<path d="M21 12a9 9 0 1 1-6.219-8.56" />}
    />
  ),
  logo: ({ size = 18 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 6v6l4 2.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
    </svg>
  ),
};
