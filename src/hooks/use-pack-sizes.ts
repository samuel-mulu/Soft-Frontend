'use client';

import { useMemo } from 'react';
import { useBottleTypes, useProducts } from '@/hooks/queries';
import { packSizeLookup, type PackSizes } from '@/lib/pack-quantity';

/** Bottles-per-dozen lookups for bottle types and products (staff screens). */
export function usePackSizes(enabled = true): PackSizes {
  const { data: bottles = [] } = useBottleTypes(enabled);
  const { data: products = [] } = useProducts(enabled);
  return useMemo(() => packSizeLookup(bottles, products), [bottles, products]);
}
