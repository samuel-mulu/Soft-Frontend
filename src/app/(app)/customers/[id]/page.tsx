'use client';

import { useParams } from 'next/navigation';
import { CustomerHistoryPage } from '@/features/customers/components/customer-detail-page';

export default function CustomerHistoryRoute() {
  const params = useParams();
  return <CustomerHistoryPage customerId={String(params.id)} />;
}
