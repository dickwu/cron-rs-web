interface SearchParamReader {
  get(name: string): string | null;
  toString(): string;
}

function isSafeInternalPath(value: string | null): value is string {
  return !!value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/login');
}

export function currentPathWithSearch(pathname: string, searchParams: SearchParamReader): string {
  const qs = searchParams.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function hrefWithReturnTo(href: string, returnTo: string): string {
  if (!isSafeInternalPath(returnTo)) return href;

  const [pathname, query = ''] = href.split('?');
  const params = new URLSearchParams(query);
  if (!params.has('from')) params.set('from', returnTo);

  return `${pathname}?${params.toString()}`;
}

export function returnToOrFallback(searchParams: SearchParamReader, fallback: string): string {
  const returnTo = searchParams.get('from');
  return isSafeInternalPath(returnTo) ? returnTo : fallback;
}

interface RouterLike {
  push(href: string): void;
  replace(href: string): void;
}

function targetsCurrentPathname(href: string): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.pathname === href.split(/[?#]/)[0];
}

/**
 * Client navigation that works around vercel/next.js#92187: in 16.2.0+
 * static exports, router.push/replace to the current pathname restores
 * stale query params from the router cache (so e.g. /tasks?id=x → /tasks
 * silently keeps ?id=x). Same-pathname navigations use the native History
 * API, which Next syncs with usePathname/useSearchParams and which does
 * not consult that cache; cross-page navigations use the router as usual.
 */
export function navPush(router: RouterLike, href: string): void {
  if (targetsCurrentPathname(href)) window.history.pushState(null, '', href);
  else router.push(href);
}

export function navReplace(router: RouterLike, href: string): void {
  if (targetsCurrentPathname(href)) window.history.replaceState(null, '', href);
  else router.replace(href);
}
