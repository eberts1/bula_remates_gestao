'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchJson } from '@/lib/query/fetch-json';
import { queryKeys } from '@/lib/query/query-keys';
import type {
  AuctionScheduleResponse,
  CreateAuctionAttendanceResult,
  ImportScheduleResult,
} from '@/types/auction-schedule';

const SCHEDULE_STALE_MS = 60 * 1000;

export function useAuctionSchedule(enabled = true) {
  return useQuery({
    queryKey: queryKeys.auctions.schedule(),
    queryFn: () => fetchJson<AuctionScheduleResponse>('/api/auctions/schedule'),
    staleTime: SCHEDULE_STALE_MS,
    enabled,
  });
}

export function useImportScheduleRows() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rows: AuctionScheduleResponse['rows']) =>
      fetchJson<ImportScheduleResult>('/api/auctions/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: rows.map((row) => ({
            name: row.name,
            scheduledAt: row.scheduledAt,
            animalType: row.animalType,
            animalSex: row.animalSex,
            livestockCategories: row.livestockCategories,
            externalKey: row.externalKey,
            isBulaRemates: row.isBulaRemates,
          })),
        }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.auctions.all });
    },
  });
}

export function useCreateAuctionAttendance(auctionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clientIds: string[]) =>
      fetchJson<CreateAuctionAttendanceResult>(
        `/api/auctions/${auctionId}/attendance`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientIds }),
        },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all });
    },
  });
}
