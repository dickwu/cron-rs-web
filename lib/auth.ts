const TOKEN_KEY = 'cron_rs_token';
const API_URL_KEY = 'cron_rs_api_url';
const DEFAULT_API_PORT = '9746';
const SERVER_DEFAULT_API_URL = `http://localhost:${DEFAULT_API_PORT}`;

declare global {
  interface Window {
    __CRON_RS_CONFIG__?: {
      apiUrl?: string | null;
    };
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export type ApiUrlSource = 'saved' | 'runtime' | 'browser';

/**
 * Resolve the daemon URL. Precedence:
 *   1. a URL the user saved in this browser (Settings / login), unless it is a
 *      loopback URL left over from another machine;
 *   2. `apiUrl` from `/runtime-config.js` (set by the embedded web server's
 *      `--api-url`);
 *   3. `<browser host>:9746`.
 * The user's explicit choice wins so the Settings override always takes
 * effect, even when the server publishes a runtime default.
 */
export function resolveApiUrl(): { url: string; source: ApiUrlSource } {
  if (typeof window === 'undefined') return { url: SERVER_DEFAULT_API_URL, source: 'browser' };

  const saved = localStorage.getItem(API_URL_KEY);
  if (saved && !isStaleLoopbackUrl(saved)) return { url: normalizeApiUrl(saved), source: 'saved' };

  const runtime = getRuntimeApiUrl();
  if (runtime) return { url: runtime, source: 'runtime' };

  return { url: defaultApiUrlFromBrowserHost(), source: 'browser' };
}

export function getApiUrl(): string {
  return resolveApiUrl().url;
}

/** `apiUrl` published by the web server in `/runtime-config.js`, if any. */
export function getRuntimeApiUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const configured = window.__CRON_RS_CONFIG__?.apiUrl?.trim();
  return configured ? normalizeApiUrl(configured) : null;
}

/** The URL used when no override is saved: runtime config, else browser host. */
export function getDefaultApiUrl(): string {
  if (typeof window === 'undefined') return SERVER_DEFAULT_API_URL;
  return getRuntimeApiUrl() ?? defaultApiUrlFromBrowserHost();
}

export function setApiUrl(url: string): void {
  localStorage.setItem(API_URL_KEY, normalizeApiUrl(url));
}

/**
 * Persist `url` only when it differs from the default; otherwise drop any
 * override so future changes to the runtime config are picked up.
 */
export function saveApiUrlIfOverride(url: string): void {
  if (normalizeApiUrl(url) === getDefaultApiUrl()) clearApiUrl();
  else setApiUrl(url);
}

export function clearApiUrl(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(API_URL_KEY);
}

export function getStoredApiUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const saved = localStorage.getItem(API_URL_KEY);
  return saved ? normalizeApiUrl(saved) : null;
}

export function getBrowserDefaultApiUrl(): string {
  if (typeof window === 'undefined') return SERVER_DEFAULT_API_URL;
  return defaultApiUrlFromBrowserHost();
}

function defaultApiUrlFromBrowserHost(): string {
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  const hostname = window.location.hostname || 'localhost';
  return `${protocol}//${hostname}:${DEFAULT_API_PORT}`;
}

function normalizeApiUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

function isStaleLoopbackUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const savedHost = parsed.hostname;
    const browserHost = window.location.hostname;

    return (
      !isLoopbackHost(browserHost) &&
      isLoopbackHost(savedHost)
    );
  } catch {
    return true;
  }
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}
