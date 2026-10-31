'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useApiQuery<T>(path: string, enabled = true) {
  return useQuery({
    queryKey: [path],
    queryFn: () => api<T>(path),
    enabled: enabled && !!path,
    placeholderData: (prev) => prev,
  });
}
