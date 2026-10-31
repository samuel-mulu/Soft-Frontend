'use client';

import { queryKeys } from '@/lib/query-keys';
import { useApiQuery } from '@/hooks/use-api-query';

export function useProducts() {
  return useApiQuery<Record<string, unknown>[]>(queryKeys.products()[0]);
}

export function useInventoryBalances() {
  return useApiQuery<Record<string, unknown>[]>(queryKeys.inventoryBalances()[0]);
}
