'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  buildClientsListQueryParams,
  buildClientsListSearchString,
  type ClientsListFilters,
} from '@/lib/query/clients-list-params';
import { fetchJson } from '@/lib/query/fetch-json';
import { queryKeys } from '@/lib/query/query-keys';
import type { ClientListItem } from '@/types/client';

export interface ClientsListResponse {
  items: ClientListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const CLIENTS_LIST_STALE_MS = 30 * 1000;

export function useClientsList(filters: ClientsListFilters) {
  const queryParams = buildClientsListQueryParams(filters);
  const queryString = buildClientsListSearchString(filters);

  return useQuery({
    queryKey: queryKeys.clients.list(queryParams),
    queryFn: () =>
      fetchJson<ClientsListResponse>(`/api/clients?${queryString}`),
    placeholderData: keepPreviousData,
    staleTime: CLIENTS_LIST_STALE_MS,
  });
}
