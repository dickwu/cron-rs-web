'use client';

import React from 'react';
import { SWRConfig } from 'swr';
import { swrFetcher } from '@/lib/api';
import { SSEProvider } from './SSEProvider';

/**
 * App-wide client providers, mounted once in the root layout so their state
 * (SWR cache, the SSE connection) survives navigation between pages.
 *
 * SWR defaults favour the cache: a page that mounts with cached data does not
 * refetch it (`revalidateIfStale: false`); freshness comes from per-hook
 * `refreshInterval` polling and SSE-driven, batched revalidation instead.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher: swrFetcher,
        revalidateIfStale: false,
        revalidateOnFocus: false,
        dedupingInterval: 5000,
        keepPreviousData: true,
        errorRetryCount: 3,
      }}
    >
      <SSEProvider>{children}</SSEProvider>
    </SWRConfig>
  );
}
