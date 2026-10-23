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
