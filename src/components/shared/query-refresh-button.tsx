'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';

/** Explicit user-triggered refresh (invalidates cache; no interval polling). */
export function QueryRefreshButton({
  queryKey,
  label = 'Refresh',
  className = 'btn btn-ghost text-xs min-h-[38px]',
}: {
  queryKey: readonly unknown[];
  label?: string;
  className?: string;
}) {
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);

  async function onRefresh() {
    setBusy(true);
    try {
      await client.invalidateQueries({ queryKey });
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className={className} disabled={busy} onClick={() => void onRefresh()}>
      <RefreshCw size={14} className={busy ? 'animate-spin mr-1.5' : 'mr-1.5'} aria-hidden />
      {busy ? 'Refreshing…' : label}
    </button>
  );
}
