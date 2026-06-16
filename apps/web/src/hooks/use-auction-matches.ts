'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchJson } from '@/lib/query/fetch-json';
import { queryKeys } from '@/lib/query/query-keys';
import type { AuctionMatchesResponse } from '@/types/auction';

const AUCTION_MATCHES_STALE_MS = 15 * 1000;

export function useAuctionMatches(
  auctionId: string,
  search = '',
  enabled = true,
) {
  const queryParams: Record<string, string> = search ? { q: search } : {};
  const queryString = new URLSearchParams(queryParams).toString();

  return useQuery({
    queryKey: queryKeys.auctions.matches(auctionId, queryParams),
    queryFn: () =>
      fetchJson<AuctionMatchesResponse>(
        `/api/auctions/${auctionId}/matches${queryString ? `?${queryString}` : ''}`,
      ),
    placeholderData: keepPreviousData,
    staleTime: AUCTION_MATCHES_STALE_MS,
    enabled: enabled && Boolean(auctionId),
  });
}

export function useAuctionMatchMutations(auctionId: string, search = '') {
  const queryClient = useQueryClient();
  const queryParams: Record<string, string> = search ? { q: search } : {};

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.auctions.all });
  };

  const includeClient = useMutation({
    mutationFn: (input: { clientId: string; notes?: string }) =>
      fetchJson<AuctionMatchesResponse>(`/api/auctions/${auctionId}/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: input.clientId,
          status: 'included',
          notes: input.notes,
        }),
      }),
    onSuccess: invalidate,
  });

  const excludeClient = useMutation({
    mutationFn: (clientId: string) =>
      fetchJson<AuctionMatchesResponse>(`/api/auctions/${auctionId}/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, status: 'excluded' }),
      }),
    onSuccess: invalidate,
  });

  const clearDecision = useMutation({
    mutationFn: (clientId: string) =>
      fetchJson<AuctionMatchesResponse>(
        `/api/auctions/${auctionId}/matches/${clientId}`,
        { method: 'DELETE' },
      ),
    onSuccess: invalidate,
  });

  return {
    includeClient,
    excludeClient,
    clearDecision,
    matchesKey: queryKeys.auctions.matches(auctionId, queryParams),
  };
}
