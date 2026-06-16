'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/query/fetch-json';
import { queryKeys } from '@/lib/query/query-keys';
import type { Client } from '@/types/client';

const CLIENT_DETAIL_STALE_MS = 60 * 1000;

export function useClientDetail(id: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.clients.detail(id ?? ''),
    queryFn: () => fetchJson<Client>(`/api/clients/${id}`),
    enabled: Boolean(id) && enabled,
    staleTime: CLIENT_DETAIL_STALE_MS,
  });
}
