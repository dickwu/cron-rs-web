'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/icons';
import { useTasks } from '@/hooks/useTasks';
import { useStatus } from '@/hooks/useRuns';
import { usePrefs } from '@/stores/prefsStore';
import { navPush } from '@/lib/navigation';

interface NavEntry {
  key: string;
  label: string;
  href: string;
  icon: (p: { size?: number }) => React.ReactElement;
}

const PRIMARY: NavEntry[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/', icon: Icon.dashboard },
  { key: 'tasks', label: 'Tasks', href: '/tasks', icon: Icon.tasks },
  { key: 'runs', label: 'Runs', href: '/runs', icon: Icon.runs },
  { key: 'hooks', label: 'Hooks', href: '/hooks', icon: Icon.hooks },
];

const SECONDARY: NavEntry[] = [
  { key: 'settings', label: 'Settings', href: '/settings', icon: Icon.settings },
];

function isActiveHref(pathname: string, href: string) {
  if (href === '/') return pathname === '/' || pathname === '';
  return pathname === href || pathname.startsWith(href + '/');
}

export function Sidebar({ onOpenCmdK }: { onOpenCmdK: () => void }) {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const theme = usePrefs((s) => s.theme);
  const toggleTheme = usePrefs((s) => s.toggleTheme);
  const { tasks } = useTasks();
  // The light status endpoint already carries a 24h run count; fetching
  // 100 run rows just to show "100" was both wasteful and wrong.
  const { status } = useStatus();

  const counts: Record<string, number | null> = {
    tasks: tasks.length,
    runs: status?.runs_24h ?? null,
    hooks: null,
    dashboard: null,
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">
          <Icon.logo size={16} />
        </div>
        <div className="brand-name">cron-rs</div>
        <span className="brand-sub">v{process.env.NEXT_PUBLIC_APP_VERSION}</span>
      </div>
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Manage</div>
        {PRIMARY.map((item) => {
          const ItemIcon = item.icon;
          const count = counts[item.key];
          const active = isActiveHref(pathname, item.href);
          return (
            <button
              key={item.key}
              className={`nav-item ${active ? 'active' : ''}`}
              onClick={() => navPush(router, item.href)}
            >
              <ItemIcon size={15} />
              {item.label}
              {count != null && (
                <span
                  className="nav-count"
                  title={item.key === 'runs' ? 'Runs in the last 24 hours' : undefined}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
        <div className="sidebar-section-label">System</div>
        {SECONDARY.map((item) => {
          const ItemIcon = item.icon;
          const active = isActiveHref(pathname, item.href);
          return (
            <button
              key={item.key}
              className={`nav-item ${active ? 'active' : ''}`}
              onClick={() => navPush(router, item.href)}
            >
              <ItemIcon size={15} />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="sidebar-foot">
        <button
          className="topbar-search"
          style={{
            background: 'transparent',
            borderColor: 'var(--sidebar-border)',
            color: 'var(--sidebar-muted)',
          }}
          onClick={onOpenCmdK}
        >
          <Icon.search size={13} /> Search…
          <span
            className="kbd"
            style={{ marginLeft: 'auto', borderColor: 'var(--sidebar-border)' }}
          >
            ⌘K
          </span>
        </button>
        <div className="flex items-center between" style={{ gap: 8 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon.user size={14} />
            <span>admin</span>
          </span>
          <button
            className="btn ghost icon sm"
            data-tooltip={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            onClick={toggleTheme}
            style={{ color: 'var(--sidebar-fg)' }}
          >
            {theme === 'dark' ? <Icon.sun size={14} /> : <Icon.moon size={14} />}
          </button>
        </div>
      </div>
    </aside>
  );
}

export function TopbarNav({ onOpenCmdK }: { onOpenCmdK: () => void }) {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const theme = usePrefs((s) => s.theme);
  const toggleTheme = usePrefs((s) => s.toggleTheme);

  const all = [...PRIMARY, ...SECONDARY];
  return (
    <div className="topbar-nav-bar">
      <div className="topbar-brand">
        <div className="brand-mark">
          <Icon.logo size={14} />
        </div>
        <span className="brand-name" style={{ color: 'var(--sidebar-active-fg)' }}>
          cron-rs
        </span>
      </div>
      <div className="topbar-nav">
        {all.map((item) => {
          const ItemIcon = item.icon;
          const active = isActiveHref(pathname, item.href);
          return (
            <button
              key={item.key}
              className={`nav-item ${active ? 'active' : ''}`}
              onClick={() => navPush(router, item.href)}
            >
              <ItemIcon size={14} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
      <button
        className="topbar-search"
        style={{
          background: 'transparent',
          borderColor: 'var(--sidebar-border)',
          color: 'var(--sidebar-muted)',
          maxWidth: 220,
        }}
        onClick={onOpenCmdK}
      >
        <Icon.search size={13} /> Search…
        <span
          className="kbd"
          style={{ marginLeft: 'auto', borderColor: 'var(--sidebar-border)' }}
        >
          ⌘K
        </span>
      </button>
      <button
        className="btn ghost icon sm"
        onClick={toggleTheme}
        style={{ color: 'var(--sidebar-fg)' }}
      >
        {theme === 'dark' ? <Icon.sun size={14} /> : <Icon.moon size={14} />}
      </button>
    </div>
  );
}

export { PRIMARY as PRIMARY_NAV, SECONDARY as SECONDARY_NAV };
