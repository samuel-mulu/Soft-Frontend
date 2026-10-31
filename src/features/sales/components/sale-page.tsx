'use client';

import { PageContainer } from '@/components/layout/page-container';
import { SaleForm } from '@/components/sale-form';

export function SalePage() {
  return (
    <PageContainer wide className="-mt-2 md:-mt-3">
      <SaleForm />
    </PageContainer>
  );
}
