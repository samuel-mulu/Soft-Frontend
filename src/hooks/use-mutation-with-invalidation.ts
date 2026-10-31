'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { post, patch } from '@/lib/api';
import { invalidateBalanceQueries } from '@/lib/query-keys';
import { toast } from 'sonner';

type RecordPayload = Record<string, unknown>;

export function useMutationWithInvalidation() {
  const [busy, setBusy] = useState(false);
  const client = useQueryClient();

  async function submit(
    path: string,
    payload: RecordPayload,
    reset?: () => void,
    method: 'POST' | 'PATCH' = 'POST',
    customerId?: string,
  ) {
    setBusy(true);
    try {
      const result = method === 'POST' ? await post(path, payload) : await patch(path, payload);
      toast.success('Saved successfully');
      await invalidateBalanceQueries(client, customerId);
      reset?.();
      return result;
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Request failed');
      return null;
    } finally {
      setBusy(false);
    }
  }

  return { submit, busy };
}
