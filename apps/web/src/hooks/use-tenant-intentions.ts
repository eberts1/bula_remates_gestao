'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/query/fetch-json';
import { queryKeys } from '@/lib/query/query-keys';
import type { TenantIntention } from '@/types/client-import';

const INTENTIONS_STALE_MS = 15 * 60 * 1000;

export function useTenantIntentions() {
  return useQuery({
    queryKey: queryKeys.tenantIntentions.all,
    queryFn: async () => {
      const data = await fetchJson<{ items?: TenantIntention[] }>(
        '/api/tenant-intentions',
      );
      return data.items ?? [];
    },
    staleTime: INTENTIONS_STALE_MS,
  });
}
