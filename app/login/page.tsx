'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/icons';
import { Toaster, toast } from '@/components/ui/Toaster';
import { login } from '@/lib/api';
import { setToken, setApiUrl, getApiUrl } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState('http://localhost:9746');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');

  useEffect(() => {
    setUrl(getApiUrl());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      setApiUrl(url);
      const res = await login({ username, password });
      setToken(res.token);
      toast('Login successful', 'success');
      router.push('/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      toast(msg === 'Unauthorized' ? 'Invalid credentials' : msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-mark">
          <Icon.logo size={22} />
        </div>
        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>
          Sign in to cron-rs
        </div>
        <div className="muted fz-13 mt-2 mb-5">
          Systemd timer management · web dashboard
        </div>
        <form onSubmit={handleSubmit}>
          <label className="field">
            <div className="label-row">
              <span className="label">API URL</span>
            </div>
            <input
              className="input mono"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={busy}
              placeholder="http://localhost:9746"
            />
          </label>
          <label className="field">
            <div className="label-row">
              <span className="label">Username</span>
            </div>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={busy}
              autoComplete="username"
              placeholder="admin"
            />
          </label>
          <label className="field">
            <div className="label-row">
              <span className="label">Password</span>
            </div>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              autoComplete="current-password"
              placeholder="Password"
            />
          </label>
          <button
            className="btn primary"
            type="submit"
            disabled={busy}
            style={{ width: '100%', height: 36 }}
          >
            {busy ? <Icon.spinner size={14} /> : null}
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <div className="mt-4 muted fz-11 text-right">cron-rs-web · v0.3.0</div>
      </div>
      <Toaster />
    </div>
  );
}
