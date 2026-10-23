import React from 'react';

export function Tag({
  children,
  className = '',
  subtle,
  mono,
  active,
  style,
  onClick,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  subtle?: boolean;
  mono?: boolean;
  active?: boolean;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
  title?: string;
}) {
  const cls = [
    'tag',
    subtle ? 'subtle' : '',
    mono ? 'mono' : '',
    active ? 'active' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  if (onClick) {
    return (
      <button
        type="button"
        className={cls}
        style={style}
        onClick={onClick}
        title={title}
        aria-pressed={active ? true : undefined}
      >
        {children}
      </button>
    );
  }
  return (
    <span className={cls} style={style} title={title}>
      {children}
    </span>
  );
}

