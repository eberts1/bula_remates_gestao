'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  buildAttendanceBoardQueryParams,
  buildAttendanceBoardSearchString,
} from '@/lib/query/attendance-board-params';
import { fetchJson } from '@/lib/query/fetch-json';
import { queryKeys } from '@/lib/query/query-keys';
import type {
  AttendanceActionCard,
  AttendanceActionDetail,
  AttendanceActionTask,
  AttendanceActivity,
  AttendanceBoardResponse,
  AttendanceFilters,
} from '@/types/attendance';

const ATTENDANCE_BOARD_STALE_MS = 15 * 1000;

export function useAttendanceBoard(filters: AttendanceFilters) {
  const queryParams = buildAttendanceBoardQueryParams(filters);
  const queryString = buildAttendanceBoardSearchString(filters);

  return useQuery({
    queryKey: queryKeys.attendance.board(queryParams),
    queryFn: () =>
      fetchJson<AttendanceBoardResponse>(`/api/attendance/board?${queryString}`),
    placeholderData: keepPreviousData,
    staleTime: ATTENDANCE_BOARD_STALE_MS,
  });
}

export function useAttendanceActionDetail(actionId: string | null) {
  return useQuery({
    queryKey: queryKeys.attendance.action(actionId ?? ''),
    queryFn: () =>
      fetchJson<AttendanceActionDetail>(`/api/attendance/actions/${actionId}`),
    enabled: Boolean(actionId),
  });
}

export function useAttendanceMutations(filters: AttendanceFilters) {
  const queryClient = useQueryClient();
  const queryParams = buildAttendanceBoardQueryParams(filters);
  const boardKey = queryKeys.attendance.board(queryParams);

  const invalidateBoard = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all });
  };

  const invalidateAction = (actionId: string) => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.attendance.action(actionId),
    });
  };

  const createColumn = useMutation({
    mutationFn: (body: { title: string; color?: string }) =>
      fetchJson('/api/attendance/columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: invalidateBoard,
  });

  const updateColumn = useMutation({
    mutationFn: ({
      columnId,
      ...body
    }: {
      columnId: string;
      title?: string;
      color?: string;
      sortOrder?: number;
    }) =>
      fetchJson(`/api/attendance/columns/${columnId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: invalidateBoard,
  });

  const deleteColumn = useMutation({
    mutationFn: (columnId: string) =>
      fetchJson(`/api/attendance/columns/${columnId}`, {
        method: 'DELETE',
      }),
    onSuccess: invalidateBoard,
  });

  const createAction = useMutation({
    mutationFn: (body: {
      columnId: string;
      clientId: string;
      auctionId?: string;
      title: string;
      description?: string;
      dueDate?: string;
    }) =>
      fetchJson<AttendanceActionCard>('/api/attendance/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: invalidateBoard,
  });

  const updateAction = useMutation({
    mutationFn: ({
      actionId,
      ...body
    }: {
      actionId: string;
      columnId?: string;
      auctionId?: string | null;
      title?: string;
      description?: string | null;
      status?: string;
      sortOrder?: number;
      dueDate?: string | null;
    }) =>
      fetchJson<AttendanceActionCard>(`/api/attendance/actions/${actionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: (_data, vars) => {
      invalidateBoard();
      invalidateAction(vars.actionId);
    },
  });

  const deleteAction = useMutation({
    mutationFn: (actionId: string) =>
      fetchJson(`/api/attendance/actions/${actionId}`, {
        method: 'DELETE',
      }),
    onSuccess: invalidateBoard,
  });

  const createTask = useMutation({
    mutationFn: ({
      actionId,
      title,
      dueDate,
    }: {
      actionId: string;
      title: string;
      dueDate?: string;
    }) =>
      fetchJson<AttendanceActionTask>(
        `/api/attendance/actions/${actionId}/tasks`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, dueDate }),
        },
      ),
    onSuccess: (_data, vars) => {
      invalidateBoard();
      invalidateAction(vars.actionId);
    },
  });

  const updateTask = useMutation({
    mutationFn: ({
      taskId,
      actionId,
      ...body
    }: {
      taskId: string;
      actionId: string;
      title?: string;
      done?: boolean;
      sortOrder?: number;
      dueDate?: string | null;
    }) =>
      fetchJson<AttendanceActionTask>(`/api/attendance/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: (_data, vars) => {
      invalidateBoard();
      invalidateAction(vars.actionId);
    },
  });

  const deleteTask = useMutation({
    mutationFn: ({
      taskId,
      actionId,
    }: {
      taskId: string;
      actionId: string;
    }) =>
      fetchJson(`/api/attendance/tasks/${taskId}`, {
        method: 'DELETE',
      }),
    onSuccess: (_data, vars) => {
      invalidateBoard();
      invalidateAction(vars.actionId);
    },
  });

  const createActivity = useMutation({
    mutationFn: ({
      actionId,
      type,
      content,
    }: {
      actionId: string;
      type: string;
      content: string;
    }) =>
      fetchJson<AttendanceActivity>(
        `/api/attendance/actions/${actionId}/activities`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, content }),
        },
      ),
    onSuccess: (_data, vars) => {
      invalidateAction(vars.actionId);
    },
  });

  return {
    createColumn,
    updateColumn,
    deleteColumn,
    createAction,
    updateAction,
    deleteAction,
    createTask,
    updateTask,
    deleteTask,
    createActivity,
    boardKey,
  };
}
