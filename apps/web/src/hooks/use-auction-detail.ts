'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/query/fetch-json';
import { queryKeys } from '@/lib/query/query-keys';
import type { AuctionDetail } from '@/types/auction';

const AUCTION_DETAIL_STALE_MS = 30 * 1000;

export function useAuctionDetail(id: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.auctions.detail(id ?? ''),
    queryFn: () => fetchJson<AuctionDetail>(`/api/auctions/${id}`),
    enabled: enabled && Boolean(id),
    staleTime: AUCTION_DETAIL_STALE_MS,
  });
}
