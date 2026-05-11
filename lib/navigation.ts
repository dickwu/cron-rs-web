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
