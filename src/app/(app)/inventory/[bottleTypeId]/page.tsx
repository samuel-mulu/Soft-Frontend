'use client';

import { use } from 'react';
import { BottleWarehouseDetail } from '@/features/inventory/components/bottle-warehouse-detail';

export default function BottleTypeWarehousePage({
  params,
}: {
  params: Promise<{ bottleTypeId: string }>;
}) {
  const { bottleTypeId } = use(params);
  return <BottleWarehouseDetail bottleTypeId={bottleTypeId} />;
}
