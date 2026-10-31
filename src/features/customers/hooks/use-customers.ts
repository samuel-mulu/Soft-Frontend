'use client';

import { queryKeys } from '@/lib/query-keys';
import { useApiQuery } from '@/hooks/use-api-query';

export type CustomerRow = Record<string, unknown>;

export function useCustomers() {
  return useApiQuery<CustomerRow[]>(queryKeys.customers()[0]);
}
