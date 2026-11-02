'use client';

import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryFreshness, type QueryFreshnessPreset } from '@/lib/query-freshness';

export type UseApiQueryOptions = {
  path: string;
  queryKey: readonly unknown[];
  enabled?: boolean;
  freshness?: QueryFreshnessPreset;
  retry?: number;
};

export function useApiQuery<T>(
  pathOrOptions: string | UseApiQueryOptions,
  enabled = true,
  freshness: QueryFreshnessPreset = 'list',
): UseQueryResult<T, Error> {
  const path = typeof pathOrOptions === 'string' ? pathOrOptions : pathOrOptions.path;
  const queryKey =
    typeof pathOrOptions === 'string' ? ([path] as const) : pathOrOptions.queryKey;
  const isEnabled =
    typeof pathOrOptions === 'string' ? enabled : (pathOrOptions.enabled ?? true);
  const stalePreset =
    typeof pathOrOptions === 'string'
      ? freshness
      : (pathOrOptions.freshness ?? 'list');
  const retry =
    typeof pathOrOptions === 'string' ? undefined : pathOrOptions.retry;

  return useQuery<T, Error>({
    queryKey,
    queryFn: () => api<T>(path),
    enabled: isEnabled && !!path,
    staleTime: queryFreshness[stalePreset],
    retry: retry ?? 1,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: true,
    placeholderData: keepPreviousData,
  });
}
