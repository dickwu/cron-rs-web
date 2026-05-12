'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Icon } from '@/components/ui/icons';
import { StatusPill } from '@/components/ui/StatusPill';
import { Tag } from '@/components/ui/Tag';
import { toast } from '@/components/ui/Toaster';
import { useStatus } from '@/hooks/useRuns';
import { usePrefs, ACCENT_COLORS } from '@/stores/prefsStore';
import {
  clearApiUrl,
  clearToken,
  getApiUrl,
  getBrowserDefaultApiUrl,
  getStoredApiUrl,
  setApiUrl,
} from '@/lib/auth';
import { swrFetcher, updateSettings } from '@/lib/api';
import { fmtDateTime } from '@/lib/date';
import type { AppSettings } from '@/lib/types';

interface TokenClaims {
  exp?: number;
  sub?: string;
}

function decodeClaims(token: string | null): TokenClaims | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, '=');
    return JSON.parse(window.atob(padded)) as TokenClaims;
  } catch {
    return null;
  }
}

export function SettingsScreen() {
  const router = useRouter();
  const { status } = useStatus();

  const [apiUrlField, setApiUrlField] = useState('http://localhost:9746');
  const [retention, setRetention] = useState(30);
  const [healthState, setHealthState] = useState<'idle' | 'checking' | 'ok' | 'fail'>('idle');
  const [savingRetention, setSavingRetention] = useState(false);
  const [browserDefault, setBrowserDefault] = useState('http://localhost:9746');
  const [currentUrl, setCurrentUrl] = useState('http://localhost:9746');
  const [storedUrl, setStoredUrl] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [claims, setClaims] = useState<TokenClaims | null>(null);
  const [origin, setOrigin] = useState('');

  const theme = usePrefs((s) => s.theme);
  const setTheme = usePrefs((s) => s.setTheme);
  const layout = usePrefs((s) => s.layout);
  const setLayout = usePrefs((s) => s.setLayout);
  const density = usePrefs((s) => s.density);
  const setDensity = usePrefs((s) => s.setDensity);
  const accent = usePrefs((s) => s.accent);
  const setAccent = usePrefs((s) => s.setAccent);
  const showSchedule = usePrefs((s) => s.showSchedule);
  const setShowSchedule = usePrefs((s) => s.setShowSchedule);
  const showCommand = usePrefs((s) => s.showCommand);
  const setShowCommand = usePrefs((s) => s.setShowCommand);
  const showTags = usePrefs((s) => s.showTags);
  const setShowTags = usePrefs((s) => s.setShowTags);

  const {
    data: settings,
    mutate: mutateSettings,
  } = useSWR<AppSettings>('/api/v1/settings', swrFetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
  });

  useEffect(() => {
    if (settings?.retention_days != null) setRetention(settings.retention_days);
  }, [settings?.retention_days]);

  useEffect(() => {
    const def = getBrowserDefaultApiUrl();
    const cur = getApiUrl();
    const stored = getStoredApiUrl();
    const tok = window.localStorage.getItem('cron_rs_token');
    setBrowserDefault(def);
    setCurrentUrl(cur);
    setApiUrlField(cur);
    setStoredUrl(stored);
    setToken(tok);
    setClaims(decodeClaims(tok));
    setOrigin(window.location.origin);
  }, []);

  const expiryLabel = claims?.exp ? fmtDateTime(claims.exp * 1000) : 'Unknown';

  const handleSaveApi = () => {
    setApiUrl(apiUrlField);
    setCurrentUrl(apiUrlField.replace(/\/+$/, ''));
    setStoredUrl(apiUrlField.replace(/\/+$/, ''));
    setHealthState('idle');
    toast('API URL saved', 'success');
  };

  const handleResetApi = () => {
    clearApiUrl();
    setCurrentUrl(browserDefault);
    setStoredUrl(null);
    setApiUrlField(browserDefault);
    setHealthState('idle');
    toast('API URL reset to browser default', 'info');
  };

  const handleCheckHealth = async () => {
    setHealthState('checking');
    try {
      const response = await fetch(`${apiUrlField.replace(/\/+$/, '')}/api/v1/health`);
      setHealthState(response.ok ? 'ok' : 'fail');
    } catch {
      setHealthState('fail');
    }
  };

  const handleSignOut = () => {
    clearToken();
    router.push('/login');
  };

  const handleSaveRetention = async () => {
    setSavingRetention(true);
    try {
      const updated = await updateSettings({ retention_days: retention });
      await mutateSettings(updated, { revalidate: false });
      toast(`Retention set to ${updated.retention_days} day(s)`, 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setSavingRetention(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-subtitle">Appearance, connection, retention, session</div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          maxWidth: 760,
        }}
      >
        <div className="card">
          <div className="card-head">
            <div className="card-title">Appearance</div>
          </div>
          <div className="card-body">
            <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label className="field">
                <div className="label-row">
                  <span className="label">Theme</span>
                </div>
                <div className="seg" style={{ display: 'inline-flex' }}>
                  {(['light', 'dark'] as const).map((t) => (
                    <button
                      key={t}
                      className={`seg-opt ${theme === t ? 'active' : ''}`}
                      onClick={() => setTheme(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </label>
              <label className="field">
                <div className="label-row">
                  <span className="label">Layout</span>
                </div>
                <div className="seg" style={{ display: 'inline-flex' }}>
                  {(['sidebar', 'topbar'] as const).map((l) => (
                    <button
                      key={l}
                      className={`seg-opt ${layout === l ? 'active' : ''}`}
                      onClick={() => setLayout(l)}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </label>
              <label className="field">
                <div className="label-row">
                  <span className="label">Density</span>
                </div>
                <div className="seg" style={{ display: 'inline-flex' }}>
                  {(['comfortable', 'compact'] as const).map((d) => (
                    <button
                      key={d}
                      className={`seg-opt ${density === d ? 'active' : ''}`}
                      onClick={() => setDensity(d)}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </label>
              <label className="field">
                <div className="label-row">
                  <span className="label">Accent</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {ACCENT_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setAccent(c)}
                      aria-label={c}
                      title={c}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        background: c,
                        border:
                          accent === c
                            ? '2px solid var(--text)'
                            : '1px solid var(--border)',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>
              </label>
            </div>
            <div className="div" />
            <div className="fz-12 muted mb-2">Tasks table columns</div>
            <div className="flex gap-3" style={{ flexWrap: 'wrap' }}>
              <label
                style={{
                  display: 'inline-flex',
                  gap: 6,
                  alignItems: 'center',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={showSchedule}
                  onChange={(e) => setShowSchedule(e.target.checked)}
                />
                Schedule
              </label>
              <label
                style={{
                  display: 'inline-flex',
                  gap: 6,
                  alignItems: 'center',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={showCommand}
                  onChange={(e) => setShowCommand(e.target.checked)}
                />
                Command
              </label>
              <label
                style={{
                  display: 'inline-flex',
                  gap: 6,
                  alignItems: 'center',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={showTags}
                  onChange={(e) => setShowTags(e.target.checked)}
                />
                Tags
              </label>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Connection</div>
          </div>
          <div className="card-body">
            <label className="field">
              <div className="label-row">
                <span className="label">API URL</span>
              </div>
              <input
                className="input mono"
                value={apiUrlField}
                onChange={(e) => setApiUrlField(e.target.value)}
                placeholder="http://server:9746"
              />
              <div className="help">
                The browser connects to the cron-rs daemon at this address.
              </div>
            </label>
            <div className="flex gap-2 mt-3">
              <button className="btn primary" onClick={handleSaveApi}>
                Save
              </button>
              <button
                className="btn"
                onClick={handleCheckHealth}
                disabled={healthState === 'checking'}
              >
                {healthState === 'checking' ? 'Checking…' : 'Test connection'}
              </button>
              <button className="btn" onClick={handleResetApi}>
                Use browser default
              </button>
            </div>
            {healthState === 'ok' && (
              <div
                className="mt-3"
                style={{
                  padding: '8px 12px',
                  background: 'var(--c-success-soft)',
                  color: 'var(--c-success)',
                  borderRadius: 6,
                  fontSize: 12,
                }}
              >
                <Icon.check size={12} style={{ verticalAlign: 'middle' }} /> Health
                check OK
              </div>
            )}
            {healthState === 'fail' && (
              <div
                className="mt-3"
                style={{
                  padding: '8px 12px',
                  background: 'var(--c-error-soft)',
                  color: 'var(--c-error)',
                  borderRadius: 6,
                  fontSize: 12,
                }}
              >
                <Icon.alert size={12} style={{ verticalAlign: 'middle' }} /> Could not
                reach the health endpoint
              </div>
            )}
            <dl className="dl mt-4">
              <dt>Current</dt>
              <dd className="mono">{currentUrl}</dd>
              <dt>Saved override</dt>
              <dd>{storedUrl ? <Tag mono>{storedUrl}</Tag> : <span className="muted">None</span>}</dd>
              <dt>Browser default</dt>
              <dd className="mono">{browserDefault}</dd>
              <dt>Web origin</dt>
              <dd className="mono">{origin}</dd>
            </dl>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Log retention</div>
              <div className="card-sub">
                Runs and their captured output older than this are deleted automatically.
              </div>
            </div>
          </div>
          <div className="card-body">
            <label className="field">
              <div className="label-row">
                <span className="label">Days to keep</span>
                <span className="hint">1 – 3650</span>
              </div>
              <input
                className="input mono"
                type="number"
                value={retention}
                onChange={(e) => setRetention(parseInt(e.target.value, 10) || 1)}
                style={{ width: 200 }}
                min={1}
                max={3650}
              />
            </label>
            <div className="flex gap-2 mt-3">
              <button
                className="btn primary"
                onClick={handleSaveRetention}
                disabled={savingRetention}
              >
                {savingRetention ? 'Saving…' : 'Save'}
              </button>
            </div>
            <dl className="dl mt-4">
              <dt>Currently</dt>
              <dd className="mono">
                {settings ? `${settings.retention_days} day(s)` : '—'}
              </dd>
            </dl>
          </div>
        </div>

        <div className="grid-2">
          <div className="card">
            <div className="card-head">
              <div className="card-title">Session</div>
              <button className="btn ghost sm danger" onClick={handleSignOut}>
                Sign out
              </button>
            </div>
            <div className="card-body">
              <dl className="dl">
                <dt>Username</dt>
                <dd className="mono">{claims?.sub || 'Unknown'}</dd>
                <dt>Token expires</dt>
                <dd className="mono">{expiryLabel}</dd>
                <dt>Token present</dt>
                <dd>
                  <StatusPill status={token ? 'enabled' : 'disabled'} />
                </dd>
              </dl>
            </div>
          </div>
          <div className="card">
            <div className="card-head">
              <div className="card-title">Runtime</div>
            </div>
            <div className="card-body">
              <dl className="dl">
                <dt>Tasks</dt>
                <dd className="mono">{status?.task_count ?? '—'}</dd>
                <dt>Active timers</dt>
                <dd className="mono">{status?.active_timers ?? '—'}</dd>
                <dt>Failures · 24h</dt>
                <dd className="mono" style={{ color: 'var(--c-error)' }}>
                  {status?.recent_failures_24h ?? '—'}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
