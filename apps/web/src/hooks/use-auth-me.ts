'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/query/fetch-json';
import { queryKeys } from '@/lib/query/query-keys';

export interface AuthMeResponse {
  user: { id: string; name: string; email: string } | null;
  tenant: { id: string; name: string; slug: string } | null;
  isSuperAdmin?: boolean;
}

const AUTH_ME_STALE_MS = 2 * 60 * 1000;

export function useAuthMe() {
  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: () => fetchJson<AuthMeResponse>('/api/auth/me'),
    staleTime: AUTH_ME_STALE_MS,
    retry: false,
  });
}
