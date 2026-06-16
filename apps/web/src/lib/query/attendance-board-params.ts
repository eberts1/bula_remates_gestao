import type { AttendanceFilters } from '@/types/attendance';

export function buildAttendanceBoardQueryParams(
  filters: AttendanceFilters,
): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.q) params.q = filters.q;
  if (filters.auctionId) params.auctionId = filters.auctionId;
  return params;
}

export function buildAttendanceBoardSearchString(
  filters: AttendanceFilters,
): string {
  const params = new URLSearchParams(buildAttendanceBoardQueryParams(filters));
  return params.toString();
}
