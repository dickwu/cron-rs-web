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

export function getApiUrl(): string {
  if (typeof window === 'undefined') return SERVER_DEFAULT_API_URL;

  const configured = window.__CRON_RS_CONFIG__?.apiUrl?.trim();
  if (configured) return normalizeApiUrl(configured);

  const saved = localStorage.getItem(API_URL_KEY);
  if (saved && !isStaleLoopbackUrl(saved)) return normalizeApiUrl(saved);

  return defaultApiUrlFromBrowserHost();
}

export function setApiUrl(url: string): void {
  localStorage.setItem(API_URL_KEY, normalizeApiUrl(url));
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
