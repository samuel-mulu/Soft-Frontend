'use client';

import { useParams } from 'next/navigation';
import { CustomerHistoryPage } from '@/components/workspace';

export default function CustomerHistoryRoute() {
  const params = useParams();
  return <CustomerHistoryPage customerId={String(params.id)} />;
}
