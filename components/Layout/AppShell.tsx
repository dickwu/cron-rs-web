'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthGuard } from './AuthGuard';
import { Sidebar, TopbarNav } from './SideNav';
import { Topbar, type Crumb } from './Topbar';
import { PulseRail } from './PulseRail';
import { CmdK } from './CmdK';
import { Toaster } from '@/components/ui/Toaster';
import { useSSE } from '@/hooks/useSSE';
import { usePrefs } from '@/stores/prefsStore';

export interface ShellHeader {
  crumbs: Crumb[];
  actions?: React.ReactNode;
}

interface AppShellProps {
  children: React.ReactNode;
  header?: ShellHeader;
}

function defaultCrumbs(pathname: string): Crumb[] {
  if (pathname === '/' || pathname === '') return [{ label: 'Dashboard' }];
  const segs = pathname.split('/').filter(Boolean);
  return segs.map((s, i) => ({
    label: s.charAt(0).toUpperCase() + s.slice(1),
    href: i === segs.length - 1 ? undefined : '/' + segs.slice(0, i + 1).join('/'),
  }));
}

export function AppShell({ children, header }: AppShellProps) {
  const layout = usePrefs((s) => s.layout);
  const { connectionStatus } = useSSE();
  const [cmdOpen, setCmdOpen] = useState(false);
  const pathname = usePathname() || '/';
  const router = useRouter();
  const isTopbar = layout === 'topbar';

  const crumbs = useMemo<Crumb[]>(() => {
    if (header?.crumbs?.length) {
      return header.crumbs.map((c) =>
        c.href && !c.onClick ? { ...c, onClick: () => router.push(c.href!) } : c,
      );
    }
    return defaultCrumbs(pathname);
  }, [header, pathname, router]);

  useEffect(() => {
    const isTypingTarget = (t: EventTarget | null) => {
      if (!(t instanceof HTMLElement)) return false;
      const tag = t.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable;
    };
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(true);
        return;
      }
      if (
        e.key === 'n' &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !isTypingTarget(e.target)
      ) {
        e.preventDefault();
        router.push('/tasks?new=1');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [router]);

  return (
    <AuthGuard>
      <div className={`shell ${isTopbar ? 'topbar-layout' : ''}`}>
        {!isTopbar && <Sidebar onOpenCmdK={() => setCmdOpen(true)} />}
        {isTopbar && <TopbarNav onOpenCmdK={() => setCmdOpen(true)} />}
        <div className="main">
          <Topbar breadcrumb={crumbs} sse={connectionStatus} actions={header?.actions} />
          <PulseRail />
          <div className="page">
            <div className="page-inner">{children}</div>
          </div>
        </div>
        <CmdK open={cmdOpen} onClose={() => setCmdOpen(false)} />
        <Toaster />
      </div>
    </AuthGuard>
  );
}
