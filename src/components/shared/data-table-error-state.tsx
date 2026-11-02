'use client';

import { LoadErrorBanner } from '@/components/shared/load-error';

export function DataTableErrorState({ error }: { error: unknown }) {
  return <LoadErrorBanner error={error} />;
}
