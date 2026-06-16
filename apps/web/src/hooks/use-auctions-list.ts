'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/query/fetch-json';
import { queryKeys } from '@/lib/query/query-keys';
import type { AuctionsListResponse } from '@/types/auction';

const AUCTIONS_LIST_STALE_MS = 30 * 1000;

export function useAuctionsList() {
  return useQuery({
    queryKey: queryKeys.auctions.list(),
    queryFn: () => fetchJson<AuctionsListResponse>('/api/auctions'),
    staleTime: AUCTIONS_LIST_STALE_MS,
  });
}
