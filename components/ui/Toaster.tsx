'use client';

import React, { useEffect, useState } from 'react';
import { Icon } from './icons';

export type ToastKind = 'info' | 'success' | 'error';

interface ToastEntry {
  id: string;
  message: string;
  type: ToastKind;
}

type ToastEvent =
  | { type: 'add'; toast: ToastEntry }
  | { type: 'remove'; id: string };

const listeners = new Set<(evt: ToastEvent) => void>();

export function toast(message: string, type: ToastKind = 'info') {
  const id = Math.random().toString(36).slice(2);
  const entry: ToastEntry = { id, message, type };
  listeners.forEach((fn) => fn({ type: 'add', toast: entry }));
  setTimeout(() => {
    listeners.forEach((fn) => fn({ type: 'remove', id }));
  }, 3200);
}

if (typeof window !== 'undefined') {
  (window as unknown as { toast?: typeof toast }).toast = toast;
}

export function Toaster() {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  useEffect(() => {
    const fn = (evt: ToastEvent) => {
      if (evt.type === 'add') setToasts((arr) => [...arr, evt.toast]);
      if (evt.type === 'remove') setToasts((arr) => arr.filter((x) => x.id !== evt.id));
    };
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return (
    <div className="toaster">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.type === 'success' && <Icon.check size={14} style={{ color: 'var(--c-success)' }} />}
          {t.type === 'error' && <Icon.alert size={14} style={{ color: 'var(--c-error)' }} />}
          {t.type === 'info' && <Icon.info size={14} />}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
