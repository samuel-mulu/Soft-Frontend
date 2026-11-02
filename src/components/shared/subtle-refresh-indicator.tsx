'use client';

import { RefreshCw } from 'lucide-react';

export function SubtleRefreshIndicator({ active, label = 'Refreshing…' }: { active: boolean; label?: string }) {
  if (!active) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
      <RefreshCw size={12} className="animate-spin" aria-hidden />
      {label}
    </span>
  );
}
